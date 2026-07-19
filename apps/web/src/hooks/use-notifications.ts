"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: any;
  createdAt: string;
}

export function useRealtimeNotifications() {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const { accessToken, isAuthenticated } = useAuthStore();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const socket = io(`${apiUrl}/notifications`, {
      auth: { token: accessToken },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    // MUHIM: haydovchi sahifasi ["driver-day-orders"] keshidan foydalanadi —
    // uni ham yangilamasak, push/toast keladi-yu RO'YXAT YANGILANMAYDI
    // (egasi 2026-07-14 da shu xatoni ko'rgan: zakaz yozildi, haydovchi
    // sahifasida boshqa sahifaga o'tmaguncha ko'rinmadi).
    const refreshOrders = (orderId?: string) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["driver-day-orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      if (orderId) qc.invalidateQueries({ queryKey: ["orders", orderId] });
    };

    // Pul o'tkazmasi yaratildi/qabul qilindi/qaytarildi — balans sahifalari
    // ochiq turgan bo'lsa darrov yangilanadi (2026-07-19)
    socket.on("transfer_updated", () => {
      qc.invalidateQueries({ queryKey: ["balances"] });
      qc.invalidateQueries({ queryKey: ["transfers"] });
    });

    // New order (for drivers)
    socket.on("new_order", (data: any) => {
      toast.info(`Yangi buyurtma: ${data.orderNumber}`, {
        description: `${data.customer?.name} — ${data.quantity} ta suv`,
        duration: 8000,
        action: { label: "Ko'rish", onClick: () => window.location.href = `/orders/${data.orderId}` },
      });
      refreshOrders();
    });

    // Status changed
    socket.on("order_status_changed", (data: any) => {
      refreshOrders(data.orderId);
    });

    // Order cancelled notification
    socket.on("order_cancelled", (data: any) => {
      toast.warning(`Buyurtma bekor qilindi: ${data.orderNumber}`, { duration: 5000 });
      refreshOrders(data.orderId);
    });

    // Order created notification
    socket.on("order_created", (data: any) => {
      toast.success(`Yangi buyurtma: ${data.orderNumber}`, {
        description: data.customerName,
        action: { label: "Ko'rish", onClick: () => window.location.href = `/orders/${data.orderId}` },
      });
      refreshOrders();
    });

    return () => { socket.disconnect(); };
  }, [isAuthenticated, accessToken]);

  return { connected };
}
