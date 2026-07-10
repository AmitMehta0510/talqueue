/**
 * @file modules/notifications/notification-dispatcher.ts
 *
 * Channel-aware notification dispatcher.
 *
 * This replaces the hardcoded EMAIL_CRITICAL_TYPES set in notifications.service.ts.
 * Instead of deciding "which types get email" in one place, the dispatcher:
 *
 *   1. Checks the user's NotificationPreference record
 *   2. Respects per-type overrides in typeOverrides JSON field
 *   3. Falls back to sensible channel defaults when no preference exists
 *
 * Channels currently supported:
 *   - IN_APP   (WebSocket via Socket.io + Redis unread counter)
 *   - EMAIL    (via enqueueEmail / mailQueue)
 *   - PUSH     (stub — ready for FCM/APNs integration)
 *
 * Usage (in notifications.service.ts):
 *   import { dispatchNotification } from "./notification-dispatcher";
 *   await dispatchNotification(notificationData, notificationDbRecord);
 */

import { NotificationType } from "@prisma/client";
import prisma from "shared/database/prisma";
import redis from "shared/database/redis";
import { getIO } from "modules/chat/socket";
import { enqueueEmail } from "services/mailQueue";
import logger from "shared/logger";

// ─── Default channel policy ───────────────────────────────────────────────────
// Which channels are ON by default for each notification type.
// Users can override these via their NotificationPreference.typeOverrides.

const DEFAULT_EMAIL_TYPES = new Set<NotificationType>([
  "PLACEMENT_DRIVE_INVITE" as NotificationType,
  "JOB_APPLICATION_UPDATE" as NotificationType,
  "REFERRAL_UPDATE"        as NotificationType,
  "HACKATHON_RESULT"       as NotificationType,
  "DRIVE_ROUND_RESULT"     as NotificationType,
]);

// Types that always deliver in-app (cannot be turned off)
const ALWAYS_IN_APP_TYPES = new Set<NotificationType>([
  "CONNECTION_REQUEST"     as NotificationType,
  "CONNECTION_ACCEPTED"    as NotificationType,
  "PLACEMENT_DRIVE_INVITE" as NotificationType,
  "JOB_APPLICATION_UPDATE" as NotificationType,
]);

// ─── Preference loader ────────────────────────────────────────────────────────

interface ChannelDecision {
  inApp: boolean;
  email: boolean;
  push:  boolean;
}

/**
 * Resolves which channels should receive this notification for this user.
 * Falls back to defaults if the user has no NotificationPreference record.
 */
async function resolveChannels(
  userId: string,
  type:   NotificationType,
): Promise<ChannelDecision> {
  let prefs: {
    inAppEnabled:  boolean;
    emailEnabled:  boolean;
    pushEnabled:   boolean;
    typeOverrides: any;
  } | null = null;

  try {
    prefs = await prisma.notificationPreference.findUnique({
      where:  { userId },
      select: { inAppEnabled: true, emailEnabled: true, pushEnabled: true, typeOverrides: true },
    });
  } catch (err: any) {
    logger.warn({ userId, err }, "[NotifDispatcher] Could not load preferences — using defaults");
  }

  // Type-level overrides in JSON: { "JOB_ALERT": { "email": false } }
  const override = (prefs?.typeOverrides as Record<string, Partial<ChannelDecision>>)?.[type] ?? {};

  return {
    inApp: ALWAYS_IN_APP_TYPES.has(type)
      ? true
      : (override.inApp ?? (prefs?.inAppEnabled ?? true)),

    email: override.email ??
      ((prefs?.emailEnabled ?? true) && DEFAULT_EMAIL_TYPES.has(type)),

    push: override.push ??
      ((prefs?.pushEnabled ?? false) && DEFAULT_EMAIL_TYPES.has(type)), // push mirrors email by default
  };
}

// ─── Channel senders ─────────────────────────────────────────────────────────

function sendInApp(userId: string, notification: any): void {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification_created", notification);
  } catch {
    // Socket.io not initialized (e.g. tests) — ignore
  }

  // Update unread counter (fire-and-forget)
  redis.incr(`notif:unread:${userId}`).catch(() => {});
}

async function sendEmail(
  userId: string,
  title:  string,
  message: string,
  actionUrl?: string,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: userId },
      select: { email: true },
    });
    if (!user?.email) return;

    const actionLink = actionUrl
      ? `<p style="margin-top:12px"><a href="${process.env.CLIENT_URL}${actionUrl}" style="color:#6366f1;font-weight:600">View Details →</a></p>`
      : "";

    await enqueueEmail(
      user.email,
      `[Engineers Platform] ${title}`,
      `<div style="font-family:sans-serif;max-width:560px;margin:auto">
        <h2 style="color:#0f172a">${title}</h2>
        <p style="color:#475569">${message}</p>
        ${actionLink}
        <hr style="margin-top:24px;border:none;border-top:1px solid #e2e8f0"/>
        <p style="font-size:11px;color:#94a3b8">
          You received this because you have email notifications enabled.
          <a href="${process.env.CLIENT_URL}/settings/notifications">Manage preferences</a>
        </p>
      </div>`,
    );
  } catch (err: any) {
    logger.warn({ userId, err }, "[NotifDispatcher] Email send failed");
  }
}

async function sendPush(_userId: string, _title: string, _message: string): Promise<void> {
  // TODO: integrate FCM (Firebase Cloud Messaging) for mobile push
  // Stub — no-op until mobile app is released.
}

// ─── Main dispatcher ─────────────────────────────────────────────────────────

export interface DispatchInput {
  userId:    string;
  type:      NotificationType;
  title:     string;
  message:   string;
  actionUrl?: string;
}

/**
 * Dispatches a notification to the appropriate channels based on user preferences.
 * Called after the Notification DB record is created.
 *
 * @param input     The notification data (same shape as createNotification input)
 * @param dbRecord  The persisted Notification row (returned by prisma.notification.create)
 */
export async function dispatchNotification(
  input:    DispatchInput,
  dbRecord: any,
): Promise<void> {
  const channels = await resolveChannels(input.userId, input.type);

  // 1. In-app (synchronous — user needs to see it immediately)
  if (channels.inApp) {
    sendInApp(input.userId, dbRecord);
  }

  // 2. Email (async — fire and forget)
  if (channels.email) {
    setImmediate(() => sendEmail(input.userId, input.title, input.message, input.actionUrl));
  }

  // 3. Push (async — fire and forget)
  if (channels.push) {
    setImmediate(() => sendPush(input.userId, input.title, input.message));
  }
}

// ─── Preference CRUD helpers ──────────────────────────────────────────────────

export async function getNotificationPreference(userId: string) {
  return prisma.notificationPreference.findUnique({ where: { userId } });
}

export async function upsertNotificationPreference(
  userId: string,
  data: Partial<{
    inAppEnabled:    boolean;
    emailEnabled:    boolean;
    pushEnabled:     boolean;
    emailDigestMode: string;
    typeOverrides:   Record<string, Partial<ChannelDecision>>;
  }>,
) {
  return prisma.notificationPreference.upsert({
    where:  { userId },
    create: { userId, ...data },
    update: data,
  });
}
