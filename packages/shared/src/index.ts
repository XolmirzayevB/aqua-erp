// ─── Enums ──────────────────────────────────────────────────────────────────

export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  OPERATOR = "OPERATOR",
  DRIVER = "DRIVER",
}

export enum OrderStatus {
  NEW = "NEW",
  PROCESSING = "PROCESSING",
  ASSIGNED = "ASSIGNED",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum PaymentType {
  CASH = "CASH",
  CARD = "CARD",
  DEBT = "DEBT",
  FREE = "FREE", // Imtiyozli/bepul — pul olinmaydi
}

export enum TransactionType {
  INCOME = "INCOME",
  EXPENSE = "EXPENSE",
  SALARY = "SALARY",
  SUPPLIER_PAYMENT = "SUPPLIER_PAYMENT",
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginDto {
  phone: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserPayload;
}

export interface UserPayload {
  id: string;
  name: string;
  phone: string;
  role: Role;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: Role;
  iat?: number;
  exp?: number;
}

// ─── Common ──────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ─── Order Status Labels ──────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.NEW]: "Yangi",
  [OrderStatus.PROCESSING]: "Jarayonda",
  [OrderStatus.ASSIGNED]: "Haydovchiga biriktirilgan",
  [OrderStatus.DELIVERED]: "Yetkazildi",
  [OrderStatus.CANCELLED]: "Bekor qilindi",
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.ADMIN]: "Administrator",
  [Role.MANAGER]: "Menejer",
  [Role.OPERATOR]: "Operator",
  [Role.DRIVER]: "Haydovchi",
};

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  [PaymentType.CASH]: "Naqd",
  [PaymentType.CARD]: "Karta",
  [PaymentType.DEBT]: "Nasiya",
  [PaymentType.FREE]: "Bepul",
};
