"use client";

import { useAuthStore } from "@/store/auth.store";

// Rol asosidagi ruxsatlar — bitta joyda.
// - MANAGER: faqat ko'rish (hech narsa yarata/tahrirlab/o'chira olmaydi)
// - Zakaz (buyurtma) yozish: OPERATOR (+ ADMIN)
// - "Yetkazildi" bosish: DRIVER (+ ADMIN)
export function usePermissions() {
  const role = useAuthStore((s) => s.user?.role);

  const isAdmin = role === "ADMIN";
  const isManager = role === "MANAGER";
  const isOperator = role === "OPERATOR";
  const isDriver = role === "DRIVER";

  return {
    role,
    isAdmin,
    isManager,
    isOperator,
    isDriver,
    // Menejer faqat ko'radi — barcha o'zgartirish tugmalari yashiriladi
    readOnly: isManager,
    canEdit: !isManager,
    // Zakazni faqat operator yozadi (admin ham qila oladi — egasi)
    canCreateOrder: isOperator || isAdmin,
    // Buyurtmani boshqarish (jarayonga olish / haydovchi tayinlash / bekor): operator/admin
    canManageOrders: isOperator || isAdmin,
    // "Yetkazildi"ni faqat haydovchi bosadi (admin ham)
    canDeliver: isDriver || isAdmin,
    // Qarz (to'lov) qabul qilish: operator, admin, va haydovchi (yetkazganда)
    canCollectDebt: isDriver || isOperator || isAdmin,
  };
}
