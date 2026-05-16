import { Server } from "socket.io";

import jwt from "jsonwebtoken";

let io: Server;

export const initializeSocket =
  (server: any) => {

    io = new Server(server, {
      cors: {
        origin: "*",
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

          const decoded =
            jwt.verify(
              token,
              process.env.JWT_SECRET!
            );

          socket.data.user =
            decoded;

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

        // Join room
        socket.on(
          "join_conversation",
          (
            conversationId: string
          ) => {

            socket.join(
              conversationId
            );
          }
        );

        // Typing indicator
        socket.on(
          "typing",
          (
            conversationId: string
          ) => {

            socket
              .to(conversationId)
              .emit(
                "user_typing",
                {
                  userId:
                    socket.data.user.id,
                }
              );
          }
        );

        socket.on(
          "stop_typing",
          (
            conversationId: string
          ) => {

            socket
              .to(conversationId)
              .emit(
                "user_stop_typing",
                {
                  userId:
                    socket.data.user.id,
                }
              );
          }
        );

        socket.on(
          "disconnect",
          () => {

            console.log(
              "Socket disconnected:",
              socket.id
            );
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