import { Server } from "socket.io";

import prisma from "shared/database/prisma";
import { verifyToken } from "shared/utils/jwt";
import { isTokenRevoked } from "modules/auth/auth.service";

let io: Server;

const getUserId = (socket: any) => socket.data.user?.id;

const getJoinedConversations = (socket: any): Set<string> => {
  if (!socket.data.joinedConversations) {
    socket.data.joinedConversations = new Set<string>();
  }

  return socket.data.joinedConversations;
};

const isParticipant = async (userId: string, conversationId: string) => {
  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId,
        userId,
      },
    },
    select: {
      id: true,
    },
  });

  return Boolean(participant);
};

const ensureSocketParticipant = async (socket: any, conversationId: string) => {
  const joinedConversations = getJoinedConversations(socket);

  if (joinedConversations.has(conversationId)) {
    return true;
  }

  const participant = await isParticipant(getUserId(socket), conversationId);

  if (participant) {
    joinedConversations.add(conversationId);
  }

  return participant;
};

const markSeen = async (userId: string, conversationId: string) => {
  const readAt = new Date();

  return prisma.$transaction(async (tx) => {
    const participant = await tx.conversationParticipant.findUnique({
      where: {
        conversationId_userId: {
          userId,
          conversationId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!participant) {
      throw new Error("Unauthorized");
    }

    await tx.conversationParticipant.update({
      where: {
        id: participant.id,
      },
      data: {
        lastReadAt: readAt,
        unreadCount: 0,
      },
    });

    const updatedMessages = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Message"
      SET "readByUsers" = array_append("readByUsers", ${userId})
      WHERE "conversationId" = ${conversationId}
        AND "senderId" <> ${userId}
        AND "deletedAt" IS NULL
        AND NOT (${userId} = ANY("readByUsers"))
      RETURNING "id"
    `;

    return {
      conversationId,
      userId,
      readAt,
      messageIds: updatedMessages.map((message) => message.id),
    };
  });
};

export const initializeSocket =
  (server: any) => {

    io = new Server(server, {
      cors: {
        // In production restrict to CLIENT_URL; in dev/test allow all origins.
        // Mirrors the same policy used by the Express HTTP CORS middleware in app.ts.
        origin:
          process.env.NODE_ENV === "production"
            ? process.env.CLIENT_URL
            : true,
        credentials: true,
      },
    });

    // Auth middleware
    io.use(
      async (socket, next) => {

        try {

          const token =
            socket.handshake.auth
              ?.token;

          if (!token) {
            return next(
              new Error(
                "Unauthorized"
              )
            );
          }

          if (await isTokenRevoked(token)) {
            return next(new Error("Unauthorized"));
          }

          const decoded = verifyToken(token);

          const user = await prisma.user.findUnique({
            where: {
              id: decoded.userId,
            },
            select: {
              id: true,
              status: true,
            },
          });

          if (!user || user.status !== "ACTIVE") {
            return next(new Error("Unauthorized"));
          }

          socket.data.user = {
            id: user.id,
          };

          next();

        } catch (error) {

          next(
            new Error(
              "Unauthorized"
            )
          );
        }
      }
    );

    io.on(
      "connection",
      (socket) => {

        console.log(
          "Socket connected:",
          socket.id
        );

        socket.join(`user:${getUserId(socket)}`);

        // Join room
        socket.on(
          "join_conversation",
          async (
            conversationId: string,
            ack?: (response: any) => void,
          ) => {
            try {
              if (!(await ensureSocketParticipant(socket, conversationId))) {
                ack?.({
                  ok: false,
                  error: "Unauthorized",
                });

                return;
              }

              socket.join(conversationId);
              getJoinedConversations(socket).add(conversationId);

              ack?.({
                ok: true,
                conversationId,
              });
            } catch {
              ack?.({
                ok: false,
                error: "Unable to join conversation",
              });
            }
          }
        );

        // ── Typing indicators ────────────────────────────────────────────────
        //
        // Client EMITS  : typing_start  { conversationId }
        //                 typing_stop   { conversationId }
        //
        // Server EMITS  : user_typing       { conversationId, userId }
        //                 user_stop_typing  { conversationId, userId }
        //
        // NOTE: The legacy plain-string events "typing" and "stop_typing" have
        //       been removed — they were never used by the client. Do not
        //       re-introduce them.
        //
        const handleTyping = async (
          event: "user_typing" | "user_stop_typing",
          conversationId: string,
          ack?: (response: any) => void,
        ) => {
          try {
            if (!(await ensureSocketParticipant(socket, conversationId))) {
              ack?.({ ok: false, error: "Unauthorized" });
              return;
            }

            socket.to(conversationId).emit(event, {
              conversationId,
              userId: getUserId(socket),
            });

            ack?.({ ok: true });
          } catch {
            ack?.({ ok: false, error: "Unable to emit typing state" });
          }
        };

        socket.on(
          "typing_start",
          (payload: { conversationId: string }, ack?: (response: any) => void) => {
            handleTyping("user_typing", payload.conversationId, ack);
          },
        );

        socket.on(
          "typing_stop",
          (payload: { conversationId: string }, ack?: (response: any) => void) => {
            handleTyping("user_stop_typing", payload.conversationId, ack);
          },
        );

        socket.on(
          "message_seen",
          async (
            payload: { conversationId: string },
            ack?: (response: any) => void,
          ) => {
            try {
              const result = await markSeen(
                getUserId(socket),
                payload.conversationId,
              );

              io.to(payload.conversationId).emit("message_seen", result);

              ack?.({
                ok: true,
                ...result,
              });
            } catch {
              ack?.({
                ok: false,
                error: "Unable to mark conversation as seen",
              });
            }
          },
        );


        socket.on("disconnect", () => {
            console.log("Socket disconnected:", socket.id);

            // Clear typing indicators in all rooms this socket had joined.
            // Without this, other participants see a stale "...is typing" banner
            // until the 2.5 s client-side timeout fires.
            const joined = getJoinedConversations(socket);
            const userId = getUserId(socket);
            if (userId && joined.size > 0) {
              for (const conversationId of joined) {
                socket.to(conversationId).emit("user_stop_typing", {
                  conversationId,
                  userId,
                });
              }
            }
          }
        );
      }
    );

    return io;
  };

export const getIO = () => {

  if (!io) {
    throw new Error(
      "Socket.io not initialized"
    );
  }

  return io;
};
