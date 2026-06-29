import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../core/contexts/AuthContext";
import { authStorage } from "../core/utils/storage";
import { useToast } from "../core/contexts/ToastContext";
import { api } from "../lib/api";

const socketUrl = api.baseUrl.replace(/\/api\/v1\/?$/, "");

export function useNotificationSocket() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = authStorage.getToken();

    if (!user || !token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    // Connect to the socket server
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      auth: { token },
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[NotificationSocket] Connected to server");
    });

    socket.on("notification_created", (payload: { title: string; message: string; type: string }) => {
      console.log("[NotificationSocket] Received notification:", payload);
      
      // Determine appropriate toast type based on notification content
      let toastType: "success" | "error" | "info" | "warning" = "info";
      if (payload.type?.includes("HIRED") || payload.type?.includes("ACCEPTED") || payload.type?.includes("SELECTED")) {
        toastType = "success";
      } else if (payload.type?.includes("REJECTED") || payload.type?.includes("DECLINED")) {
        toastType = "warning";
      }

      // Display in-app toast notification
      showToast(toastType, `${payload.title}: ${payload.message}`);

      // Invalidate relevant React Query caches for real-time visual updates
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      if (payload.type?.includes("PLACEMENT_DRIVE") || payload.type?.includes("PLACEMENT")) {
        queryClient.invalidateQueries({ queryKey: ["placementDrives"] });
      }
      
      if (payload.type?.includes("DRIVE_INVITE")) {
        queryClient.invalidateQueries({ queryKey: ["driveInvites"] });
      }
    });

    socket.on("disconnect", () => {
      console.log("[NotificationSocket] Disconnected from server");
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient, showToast]);
}
