import { Request } from "express";

// Extend express request to include authenticated user
export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    shopId: string;
    role: "OWNER" | "ADMIN" | "CASHIER";
  };
}

export type Role = "OWNER" | "ADMIN" | "CASHIER";
