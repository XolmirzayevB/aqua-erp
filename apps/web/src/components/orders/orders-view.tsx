"use client";

// Buyurtmalar sahifasi rolga qarab bo'linadi:
// - HAYDOVCHI: soddalashtirilgan, hudud filtri + jami tara ko'rsatkichi bilan mobil ko'rinish
// - Boshqalar (admin/operator/menejer): to'liq jadval (sahifalash, tayinlash, bekor qilish)
import { usePermissions } from "@/hooks/use-permissions";
import { OrdersTable } from "./orders-table";
import { DriverOrders } from "./driver-orders";

export function OrdersView() {
  const { isDriver } = usePermissions();
  return isDriver ? <DriverOrders /> : <OrdersTable />;
}
