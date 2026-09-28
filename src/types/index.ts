import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    shopId: string | null;
    role: "OWNER" | "ADMIN" | "CASHIER";
  };
}

export type Role = "OWNER" | "ADMIN" | "CASHIER";
