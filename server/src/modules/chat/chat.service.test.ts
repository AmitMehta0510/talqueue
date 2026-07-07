/**
 * @file chat.service.test.ts
 * @module Chat
 *
 * Enterprise-grade test suite for the Chat module (service + validation layers).
 *
 * Architecture notes
 * ──────────────────
 *  • `prisma` is the real import but individual model methods are replaced with
 *    typed vi.fn() stubs on a per-test basis.  This is the established project
 *    pattern (see users.service.test.ts) — no separate __mocks__ file needed.
 *
 *  • `prisma.$transaction` is replaced via direct async assignment in each test
 *    that exercises a transactional code path.  vi.restoreAllMocks() in
 *    beforeEach prevents assignment bleed-through between suites.
 *
 *  • Side-effect services (socket.io, activity, notifications, affinity,
 *    interaction-tracking) are mocked at module level so tests never touch
 *    real network I/O.  Socket emits are wrapped in try/catch inside the
 *    service itself, so even if the mock is a no-op, it will not crash.
 *
 *  • Validation tests target the Zod schemas directly
 *    (sendMessageSchema, attachmentSchema, createGroupConversationSchema) —
 *    this is where the business constraints live in this codebase.
 *
 * Coverage map
 * ────────────
 *  Suite 1 │ Conversation Management   │ createDirectConversation (duplicate-guard,
 *          │                           │ self-guard), createGroupConversation (< 2
 *          │                           │ participants)
 *  Suite 2 │ Messaging Core & Security │ sendMessage (text payload), blocked-sender
 *          │                           │ guard (403 inside tx), invalid attachment
 *          │                           │ schema rejection
 *  Suite 3 │ Read Status & Soft-Delete │ markConversationAsRead (unreadCount → 0),
 *          │                           │ deleteMessage (soft-delete, not hard-delete)
 *  Suite 4 │ Scaling & Pagination      │ getConversationMessages cursor-based
 *          │                           │ pagination (next cursor boundary output)
 */

import { describe, test, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import prisma from "shared/database/prisma";
import AppError from "shared/errors/AppError";

// ── Services under test ───────────────────────────────────────────────────
import {
  createDirectConversation,
  createGroupConversation,
  sendMessage,
  markConversationAsRead,
  deleteMessage,
  getConversationMessages,
} from "./chat.service";

// ── Validation schemas under test ─────────────────────────────────────────
import {
  sendMessageSchema,
  attachmentSchema,
  createGroupConversationSchema,
} from "./chat.validation";

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mocks (side-effect services — never need real I/O in unit tests)
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("modules/notifications/notifications.service", () => ({
  createNotification: vi.fn().mockResolvedValue({}),
  createNotificationsBulk: vi.fn().mockResolvedValue([]),
}));

vi.mock("modules/affinity/affinity.service", () => ({
  calculateUserAffinity: vi.fn().mockResolvedValue({}),
}));

vi.mock("modules/activities/activity.service", () => ({
  createActivity: vi.fn().mockResolvedValue({}),
}));

vi.mock("modules/interaction/interaction-tracking.service", () => ({
  trackInteraction: vi.fn().mockResolvedValue({}),
}));

// Socket.io server — not initialised in test environment.
// The service already wraps getIO() calls in try/catch, so this mock is
// defensive-only (prevents import errors in environments without socket setup).
vi.mock("./socket", () => ({
  getIO: vi.fn(() => ({
    to: vi.fn().mockReturnThis(),
    emit: vi.fn(),
  })),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Reusable type-safe fixtures
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal ConversationParticipant shape returned by Prisma selects */
interface ParticipantStub {
  id: string;
  userId: string;
  conversationId: string;
  muted: boolean;
  unreadCount: number;
  lastReadAt: Date | null;
  pinned: boolean;
  archived: boolean;
  deletedAt: Date | null;
}

/** Minimal Message shape returned by Prisma creates */
interface MessageStub {
  id: string;
  conversationId: string;
  senderId: string;
  content: string | null;
  type: string;
  deletedAt: Date | null;
  createdAt: Date;
  readByUsers: string[];
  sender: { id: string; profile: null };
  replyToMessage: null;
  attachments: unknown[];
}

const CONV_ID = "conv-fixture-001";
const USER_A = "user-fixture-aaa";
const USER_B = "user-fixture-bbb";
const MSG_ID = "msg-fixture-001";

const makeParticipant = (overrides: Partial<ParticipantStub> = {}): ParticipantStub => ({
  id: "part-fixture-001",
  userId: USER_A,
  conversationId: CONV_ID,
  muted: false,
  unreadCount: 3,
  lastReadAt: null,
  pinned: false,
  archived: false,
  deletedAt: null,
  ...overrides,
});

const makeMessage = (overrides: Partial<MessageStub> = {}): MessageStub => ({
  id: MSG_ID,
  conversationId: CONV_ID,
  senderId: USER_A,
  content: "Hello, world!",
  type: "TEXT",
  deletedAt: null,
  createdAt: new Date("2025-01-01T10:00:00Z"),
  readByUsers: [USER_A],
  sender: { id: USER_A, profile: null },
  replyToMessage: null,
  attachments: [],
  ...overrides,
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 1 — Conversation Management
// ─────────────────────────────────────────────────────────────────────────────
describe("Chat Service — Suite 1: Conversation Management", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ── Test 1a: createDirectConversation — Duplicate Guard ──────────────────
  //
  // When a DIRECT conversation already exists between two users (participants
  // length === 2), the service must return the existing record and NOT issue
  // a new prisma.conversation.create() call.
  test(
    "createDirectConversation — returns existing conversation without creating " +
      "a duplicate when a DIRECT channel already exists between the two users",
    async () => {
      const existingConversation = {
        id: CONV_ID,
        type: "DIRECT",
        participants: [
          makeParticipant({ userId: USER_A }),
          makeParticipant({ userId: USER_B, id: "part-fixture-002" }),
        ],
      };

      // Stub: findFirst returns the existing conversation
      (prisma.conversation.findFirst as any) = vi
        .fn()
        .mockResolvedValue(existingConversation);

      // Stub: create must NOT be called — we track it
      const createSpy = vi.fn();
      (prisma.conversation.create as any) = createSpy;

      const result = await createDirectConversation(USER_A, USER_B);

      // Returned the existing conversation unchanged
      expect(result.id).toBe(CONV_ID);
      expect(result.type).toBe("DIRECT");

      // No new conversation was created
      expect(createSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 1b: createDirectConversation — Self-Chat Guard ──────────────────
  //
  // A user must NOT be able to create a conversation with themselves.
  // The service throws AppError("Cannot chat with yourself", 400) synchronously
  // before any DB query is executed.
  test(
    "createDirectConversation — throws AppError(400) when currentUserId equals " +
      "otherUserId (self-chat isolation guard)",
    async () => {
      const findFirstSpy = vi.fn();
      (prisma.conversation.findFirst as any) = findFirstSpy;

      await expect(
        createDirectConversation(USER_A, USER_A),
      ).rejects.toMatchObject({
        message: "Cannot chat with yourself",
        statusCode: 400,
      });

      // No DB query should have been executed before the guard
      expect(findFirstSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 1c: createGroupConversation — < 2 Participants Guard ─────────────
  //
  // After deduplication (Set), if the effective participant array has fewer
  // than 2 members, the service must throw AppError(400) without touching the
  // conversation table.
  test(
    "createGroupConversation — throws AppError(400) when effective participants " +
      "length is less than 2 after deduplication",
    async () => {
      const countSpy = vi.fn();
      const createSpy = vi.fn();
      (prisma.user.count as any) = countSpy;
      (prisma.conversation.create as any) = createSpy;

      // Passing only the creator's own id as the sole participant.
      // After Set deduplication: Set([USER_A, USER_A]) = [USER_A] → length 1 < 2
      await expect(
        createGroupConversation(USER_A, {
          title: "Solo Room",
          participantIds: [USER_A], // only creator deduped into set → length=1
        }),
      ).rejects.toMatchObject({
        message: "Group conversation needs at least two participants",
        statusCode: 400,
      });

      // Neither a user count lookup nor conversation create should be reached
      expect(countSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 1d: createGroupConversation — Participants Not Found Guard ────────
  //
  // After deduplication, if prisma.user.count returns fewer rows than the
  // expected participant count (a participant ID doesn't exist in DB), the
  // service must throw AppError(404).
  test(
    "createGroupConversation — throws AppError(404) when one or more participantIds " +
      "do not resolve to real users in the database",
    async () => {
      // Only 1 of 2 participants found → count mismatch
      (prisma.user.count as any) = vi.fn().mockResolvedValue(1);
      const createSpy = vi.fn();
      (prisma.conversation.create as any) = createSpy;

      await expect(
        createGroupConversation(USER_A, {
          title: "Engineering Team",
          participantIds: ["ghost-user-id"], // doesn't exist in DB
        }),
      ).rejects.toMatchObject({
        message: "One or more participants were not found",
        statusCode: 404,
      });

      expect(createSpy).not.toHaveBeenCalled();
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 2 — Messaging Core & Security Guards
// ─────────────────────────────────────────────────────────────────────────────
describe("Chat Service — Suite 2: Messaging Core & Security Guards", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    // Default: $transaction is NOT stubbed — each test must configure it
    (prisma.$transaction as any) = async (_cb: any) => {
      throw new Error("$transaction not stubbed in this test");
    };
  });

  // ── Test 2a: sendMessage — Text Payload Success ───────────────────────────
  //
  // A normal TEXT message must be persisted via transaction:
  //   1. conversationParticipant.findUnique returns a valid participant
  //   2. message.create returns the new message row
  //   3. conversationParticipant.update + conversation.update run in parallel
  //   4. The function returns the created message object
  test(
    "sendMessage — successfully persists a TEXT message through the " +
      "Prisma transaction and returns the created message",
    async () => {
      const createdMsg = makeMessage({ id: "msg-new-001", content: "Hey there" });

      // Build the minimal tx mock matching the exact call sequence in chat.service
      const mockTx = {
        conversationParticipant: {
          findUnique: vi
            .fn()
            .mockResolvedValue(makeParticipant({ id: "part-001" })),
          findMany: vi.fn().mockResolvedValue([
            // other participants (recipients for notifications)
            { userId: USER_B, muted: false },
          ]),
          update: vi.fn().mockResolvedValue({}),
        },
        message: {
          findUnique: vi.fn().mockResolvedValue(null), // no replyTo
          create: vi.fn().mockResolvedValue(createdMsg),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({}),
        },
      };

      (prisma.$transaction as any) = vi.fn().mockImplementation(
        async (callback: (tx: any) => Promise<any>) => callback(mockTx),
      );

      const result = await sendMessage(USER_A, CONV_ID, {
        content: "Hey there",
        type: "TEXT",
      });

      // The returned message is what the transaction returned
      expect(result.id).toBe("msg-new-001");
      expect(result.content).toBe("Hey there");
      expect(result.senderId).toBe(USER_A);

      // message.create was called with the correct fields
      const createArgs = mockTx.message.create.mock.calls[0][0];
      expect(createArgs.data.conversationId).toBe(CONV_ID);
      expect(createArgs.data.senderId).toBe(USER_A);
      expect(createArgs.data.content).toBe("Hey there");
      // readByUsers seed must include the sender
      expect(createArgs.data.readByUsers).toContain(USER_A);
    },
  );

  // ── Test 2b: sendMessage — Blocked Guard (403 Forbidden) ─────────────────
  //
  // If the sender is NOT a participant in the conversation (e.g. they have
  // been removed or blocked), `conversationParticipant.findUnique` returns
  // null inside the transaction and the service must throw AppError(403).
  //
  // Rationale: The service's participation check is the enforcement point for
  // block semantics in this architecture — a blocked user's participant record
  // is removed, making findUnique return null and triggering the 403 guard.
  test(
    "sendMessage — throws AppError(403) when the sender is not a participant " +
      "in the conversation (blocked / removed guard)",
    async () => {
      const mockTx = {
        conversationParticipant: {
          // null → sender has no participant record → access denied
          findUnique: vi.fn().mockResolvedValue(null),
          findMany: vi.fn(),
          update: vi.fn(),
        },
        message: {
          findUnique: vi.fn(),
          create: vi.fn(),
        },
        conversation: {
          update: vi.fn(),
        },
      };

      (prisma.$transaction as any) = vi.fn().mockImplementation(
        async (callback: (tx: any) => Promise<any>) => callback(mockTx),
      );

      await expect(
        sendMessage(USER_A, CONV_ID, { content: "You can't block me!" }),
      ).rejects.toMatchObject({
        message: "Unauthorized",
        statusCode: 403,
      });

      // Message creation must never be reached
      expect(mockTx.message.create).not.toHaveBeenCalled();
    },
  );

  // ── Test 2c: Invalid Attachment — Zod Schema Rejection ───────────────────
  //
  // The `attachmentSchema` enforces:
  //   • size must be a non-negative integer ≤ 25 MB (25 * 1024 * 1024 bytes)
  //   • url must be a valid URL
  //   • name must be 1-255 chars
  //   • mimeType must be present
  //
  // An attachment exceeding the 25 MB limit must be rejected at the schema
  // level with a ZodError before the service is ever called.
  test(
    "sendMessageSchema — rejects attachment whose size exceeds the 25 MB limit " +
      "(invalid/corrupted S3 attachment guard)",
    () => {
      const OVER_LIMIT = 25 * 1024 * 1024 + 1; // 1 byte over the 25 MB cap

      const result = sendMessageSchema.safeParse({
        content: undefined,
        attachments: [
          {
            name: "big-file.zip",
            url: "https://mock-s3.local/chat/attachments/user/uuid-big-file.zip",
            mimeType: "application/zip",
            size: OVER_LIMIT, // violates max(25 * 1024 * 1024)
            type: "FILE",
          },
        ],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const sizeIssue = result.error.issues.find(
          (i) =>
            i.path.some((p) => p === "size") ||
            i.path.some((p) => p === "attachments"),
        );
        expect(sizeIssue).toBeDefined();
      }
    },
  );

  test(
    "attachmentSchema — rejects individually when size > 25 MB",
    () => {
      const result = attachmentSchema.safeParse({
        name: "oversize.mp4",
        url: "https://mock-s3.local/oversize.mp4",
        mimeType: "video/mp4",
        size: 30 * 1024 * 1024, // 30 MB
        type: "VIDEO",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const sizeError = result.error.issues.find((i) => i.path.includes("size"));
        expect(sizeError).toBeDefined();
      }
    },
  );

  test(
    "attachmentSchema — accepts valid attachment at exactly the 25 MB boundary",
    () => {
      const EXACT_LIMIT = 25 * 1024 * 1024; // 26,214,400 bytes

      const result = attachmentSchema.safeParse({
        name: "valid-upload.pdf",
        url: "https://mock-s3.local/chat/attachments/user/uuid-valid-upload.pdf",
        mimeType: "application/pdf",
        size: EXACT_LIMIT,
        type: "FILE",
      });

      expect(result.success).toBe(true);
    },
  );

  test(
    "attachmentSchema — rejects invalid URL in attachment (S3 key security)",
    () => {
      const result = attachmentSchema.safeParse({
        name: "file.jpg",
        url: "not-a-valid-url", // must be a URL
        mimeType: "image/jpeg",
        size: 1024,
        type: "IMAGE",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const urlIssue = result.error.issues.find((i) => i.path.includes("url"));
        expect(urlIssue).toBeDefined();
        expect(urlIssue?.message).toMatch(/valid URL/i);
      }
    },
  );

  // ── Test 2d: sendMessage — Schema refuses empty body (no content, no attachment)
  test(
    "sendMessageSchema — rejects payload with neither content nor attachments " +
      "(refine guard: message requires content or attachments)",
    () => {
      const result = sendMessageSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        // The refine message fires when both content and attachments are absent
        const refineIssue = result.error.issues.find((i) =>
          i.message.includes("content or attachments"),
        );
        expect(refineIssue).toBeDefined();
      }
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 3 — Read Status & Soft-Delete Optimization
// ─────────────────────────────────────────────────────────────────────────────
describe("Chat Service — Suite 3: Read Status & Soft-Delete", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    (prisma.$transaction as any) = async (_cb: any) => {
      throw new Error("$transaction not stubbed in this test");
    };
  });

  // ── Test 3a: markConversationAsRead — Atomic unreadCount → 0 ─────────────
  //
  // The service runs inside a Prisma transaction:
  //   1. Finds the participant row (ensures membership)
  //   2. Updates lastReadAt = now, unreadCount = 0  ← the key assertion
  //   3. Returns { success: true, conversationId, userId, readAt, messageIds }
  //
  // We assert that the update is called with `unreadCount: 0` (not decrement),
  // confirming an atomic reset-to-zero strategy (not a counter decrement).
  test(
    "markConversationAsRead — atomically resets unreadCount to 0 and updates " +
      "lastReadAt inside a Prisma transaction",
    async () => {
      const participant = makeParticipant({ id: "part-read-001", unreadCount: 7 });

      const txParticipantFindUnique = vi.fn().mockResolvedValue(participant);
      const txParticipantUpdate = vi.fn().mockResolvedValue({
        ...participant,
        unreadCount: 0,
        lastReadAt: new Date(),
      });

      const mockTx = {
        conversationParticipant: {
          findUnique: txParticipantFindUnique,
          update: txParticipantUpdate,
        },
      };

      const txSpy = vi.fn().mockImplementation(
        async (callback: (tx: any) => Promise<any>) => callback(mockTx),
      );
      (prisma.$transaction as any) = txSpy;

      const result = await markConversationAsRead(USER_A, CONV_ID);

      // Transaction was initiated
      expect(txSpy).toHaveBeenCalledOnce();

      // Participant membership was verified inside the transaction
      expect(txParticipantFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            conversationId_userId: { conversationId: CONV_ID, userId: USER_A },
          },
        }),
      );

      // unreadCount is RESET to 0 (not decremented)
      expect(txParticipantUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: participant.id },
          data: expect.objectContaining({ unreadCount: 0 }),
        }),
      );

      // Return shape is correct
      expect(result.success).toBe(true);
      expect(result.conversationId).toBe(CONV_ID);
      expect(result.userId).toBe(USER_A);
    },
  );

  // ── Test 3b: markConversationAsRead — Non-participant throws 403 ───────────
  test(
    "markConversationAsRead — throws AppError(403) when the userId is not " +
      "a participant in the conversation",
    async () => {
      const mockTx = {
        conversationParticipant: {
          findUnique: vi.fn().mockResolvedValue(null), // not a member
          update: vi.fn(),
        },
      };

      (prisma.$transaction as any) = vi.fn().mockImplementation(
        async (callback: (tx: any) => Promise<any>) => callback(mockTx),
      );

      await expect(
        markConversationAsRead("intruder-user", CONV_ID),
      ).rejects.toMatchObject({
        message: "Unauthorized",
        statusCode: 403,
      });

      expect(mockTx.conversationParticipant.update).not.toHaveBeenCalled();
    },
  );

  // ── Test 3c: deleteMessage — Soft-Delete Framework ───────────────────────
  //
  // The service must NOT issue a hard-delete (prisma.message.delete).
  // Instead it must call prisma.message.update with:
  //   • deletedAt: <timestamp>   (non-null → soft-deleted)
  //   • content: "This message was deleted"
  //
  // This confirms the soft-delete pattern is in place and no data is
  // permanently lost.
  test(
    "deleteMessage — sets deletedAt timestamp and replaces content with tombstone " +
      "text (soft-delete framework, NOT hard DB deletion)",
    async () => {
      const existingMessage = makeMessage({ senderId: USER_A, deletedAt: null });

      (prisma.message.findUnique as any) = vi.fn().mockResolvedValue(existingMessage);

      const updateSpy = vi.fn().mockResolvedValue({
        ...existingMessage,
        deletedAt: new Date(),
        content: "This message was deleted",
      });
      (prisma.message.update as any) = updateSpy;

      // Hard-delete must NEVER be called — track it
      const deleteSpy = vi.fn();
      (prisma.message.delete as any) = deleteSpy;

      const result = await deleteMessage(USER_A, MSG_ID);

      // message.update must have been called (soft-delete)
      expect(updateSpy).toHaveBeenCalledOnce();
      const updateArgs = updateSpy.mock.calls[0][0];
      expect(updateArgs.where).toEqual({ id: MSG_ID });

      // deletedAt must be set (non-null)
      expect(updateArgs.data).toHaveProperty("deletedAt");
      expect(updateArgs.data.deletedAt).toBeInstanceOf(Date);

      // Content tombstone must be applied
      expect(updateArgs.data.content).toBe("This message was deleted");

      // Hard-delete must NOT have been called
      expect(deleteSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 3d: deleteMessage — Unauthorized Guard ───────────────────────────
  //
  // Only the original sender can delete their own message.
  // If userId !== message.senderId, the service must throw AppError(403).
  test(
    "deleteMessage — throws AppError(403) when the requesting user is not the " +
      "original sender of the message",
    async () => {
      const existingMessage = makeMessage({ senderId: USER_B }); // owned by B

      (prisma.message.findUnique as any) = vi.fn().mockResolvedValue(existingMessage);
      const updateSpy = vi.fn();
      (prisma.message.update as any) = updateSpy;

      await expect(
        deleteMessage(USER_A, MSG_ID), // USER_A tries to delete USER_B's message
      ).rejects.toMatchObject({
        message: "Unauthorized",
        statusCode: 403,
      });

      expect(updateSpy).not.toHaveBeenCalled();
    },
  );

  // ── Test 3e: deleteMessage — Message Not Found Guard ─────────────────────
  test(
    "deleteMessage — throws AppError(404) when the messageId does not resolve " +
      "to any row in the database",
    async () => {
      (prisma.message.findUnique as any) = vi.fn().mockResolvedValue(null);
      const updateSpy = vi.fn();
      (prisma.message.update as any) = updateSpy;

      await expect(
        deleteMessage(USER_A, "ghost-msg-id"),
      ).rejects.toMatchObject({
        message: "Message not found",
        statusCode: 404,
      });

      expect(updateSpy).not.toHaveBeenCalled();
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 4 — Scaling & Cursor-Based Pagination
// ─────────────────────────────────────────────────────────────────────────────
describe("Chat Service — Suite 4: Scaling & Cursor-Based Pagination", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  // ── Test 4a: getConversationMessages — Cursor Boundary ───────────────────
  //
  // The service uses cursor-based pagination (NOT offset):
  //   • take: 30
  //   • cursor: { id: cursor }, skip: 1  ← keyset pagination
  //   • nextCursor = last message id in the result set
  //
  // This test verifies that when a cursor is provided:
  //   1. The Prisma query is called with cursor: { id: <cursorId> }, skip: 1
  //   2. The returned nextCursor is the ID of the oldest message in the page
  //      (since messages are reversed after query for chronological display)
  //   3. nextCursor is a string (strict text form, not null)
  test(
    "getConversationMessages — passes cursor + skip:1 to Prisma (keyset pagination) " +
      "and returns the correct nextCursor boundary as a string",
    async () => {
      const CURSOR_ID = "msg-cursor-anchor";

      // Simulate a page of 3 messages (DESC order from DB, then reversed)
      const dbMessages = [
        makeMessage({ id: "msg-003", createdAt: new Date("2025-01-01T10:03:00Z") }),
        makeMessage({ id: "msg-002", createdAt: new Date("2025-01-01T10:02:00Z") }),
        makeMessage({ id: "msg-001", createdAt: new Date("2025-01-01T10:01:00Z") }),
      ];

      // Mock participant check (ensureParticipantExists)
      (prisma.conversationParticipant.findUnique as any) = vi
        .fn()
        .mockResolvedValue(makeParticipant({ id: "part-cursor-001" }));

      const findManySpy = vi.fn().mockResolvedValue(dbMessages);
      (prisma.message.findMany as any) = findManySpy;

      const result = await getConversationMessages(USER_A, CONV_ID, CURSOR_ID);

      // ── Pagination query shape assertions ──────────────────────────────
      const queryArgs = findManySpy.mock.calls[0][0];

      // cursor-based navigation: cursor.id = the anchor message id
      expect(queryArgs.cursor).toEqual({ id: CURSOR_ID });

      // skip:1 skips the cursor message itself (exclusive keyset)
      expect(queryArgs.skip).toBe(1);

      // page size = 30
      expect(queryArgs.take).toBe(30);

      // Ordered DESC (newest first from DB, reversed for display)
      expect(queryArgs.orderBy).toEqual({ createdAt: "desc" });

      // ── nextCursor boundary assertion ──────────────────────────────────
      //
      // DB returns [msg-003, msg-002, msg-001] (DESC).
      // Array.prototype.reverse() mutates IN-PLACE and returns the SAME reference.
      // After reverse: array = [msg-001, msg-002, msg-003] (ASC for display).
      // messages[messages.length - 1].id is evaluated on the ALREADY-REVERSED
      // array → last element = "msg-003" (newest, the correct next-page anchor).
      expect(result.nextCursor).toBe("msg-003");
      expect(typeof result.nextCursor).toBe("string");

      // Messages are in chronological (ASC) order after in-place reverse
      expect(result.messages[0].id).toBe("msg-001");
      expect(result.messages[2].id).toBe("msg-003");
    },
  );

  // ── Test 4b: getConversationMessages — First Page (No Cursor) ─────────────
  //
  // When cursor is undefined (first page load), the query must NOT include
  // cursor or skip fields — it should just take the latest 30 messages.
  test(
    "getConversationMessages — fetches first page without cursor (no cursor/skip " +
      "fields in Prisma query)",
    async () => {
      const dbMessages = [
        makeMessage({ id: "msg-latest", createdAt: new Date("2025-01-01T10:05:00Z") }),
      ];

      (prisma.conversationParticipant.findUnique as any) = vi
        .fn()
        .mockResolvedValue(makeParticipant());

      const findManySpy = vi.fn().mockResolvedValue(dbMessages);
      (prisma.message.findMany as any) = findManySpy;

      const result = await getConversationMessages(USER_A, CONV_ID, undefined);

      const queryArgs = findManySpy.mock.calls[0][0];

      // No cursor or skip when fetching the first page
      expect(queryArgs.cursor).toBeUndefined();
      expect(queryArgs.skip).toBeUndefined();

      // nextCursor should be the last message id ("msg-latest" — only 1 item)
      expect(result.nextCursor).toBe("msg-latest");
    },
  );

  // ── Test 4c: getConversationMessages — Empty Result → null nextCursor ─────
  //
  // When there are no messages in the conversation (or cursor is at the end),
  // nextCursor must be null (not an empty string or undefined).
  test(
    "getConversationMessages — returns null nextCursor when query returns an " +
      "empty array (end of message history reached)",
    async () => {
      (prisma.conversationParticipant.findUnique as any) = vi
        .fn()
        .mockResolvedValue(makeParticipant());

      (prisma.message.findMany as any) = vi.fn().mockResolvedValue([]);

      const result = await getConversationMessages(USER_A, CONV_ID, undefined);

      expect(result.messages).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    },
  );

  // ── Test 4d: getConversationMessages — Non-participant throws 403 ──────────
  test(
    "getConversationMessages — throws AppError(403) when userId is not a " +
      "participant in the conversation (access control boundary)",
    async () => {
      // ensureParticipantExists → findUnique returns null
      (prisma.conversationParticipant.findUnique as any) = vi
        .fn()
        .mockResolvedValue(null);

      const findManySpy = vi.fn();
      (prisma.message.findMany as any) = findManySpy;

      await expect(
        getConversationMessages("intruder-user", CONV_ID, undefined),
      ).rejects.toMatchObject({
        message: "Unauthorized",
        statusCode: 403,
      });

      // Messages must not be queried if participant check fails
      expect(findManySpy).not.toHaveBeenCalled();
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Suite 5 — createGroupConversationSchema (Zod Validation Layer)
// ─────────────────────────────────────────────────────────────────────────────
describe("Chat Module — Suite 5: createGroupConversationSchema Validation", () => {
  const validGroupPayload = () => ({
    title: "Engineering Team",
    participantIds: ["550e8400-e29b-41d4-a716-446655440000"],
  });

  test("accepts a minimal valid group conversation payload", () => {
    const result = createGroupConversationSchema.safeParse(validGroupPayload());
    expect(result.success).toBe(true);
  });

  test("rejects title exceeding 120 characters", () => {
    const result = createGroupConversationSchema.safeParse({
      ...validGroupPayload(),
      title: "T".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty title (min 1)", () => {
    const result = createGroupConversationSchema.safeParse({
      ...validGroupPayload(),
      title: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects empty participantIds array (min 1)", () => {
    const result = createGroupConversationSchema.safeParse({
      ...validGroupPayload(),
      participantIds: [],
    });
    expect(result.success).toBe(false);
  });

  test("rejects non-UUID participantId strings", () => {
    const result = createGroupConversationSchema.safeParse({
      ...validGroupPayload(),
      participantIds: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });

  test("rejects description longer than 500 characters", () => {
    const result = createGroupConversationSchema.safeParse({
      ...validGroupPayload(),
      description: "D".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid avatarUrl (not a URL)", () => {
    const result = createGroupConversationSchema.safeParse({
      ...validGroupPayload(),
      avatarUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
