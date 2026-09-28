import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "@custom-types/index";
import z from "zod";

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured");
}

const jwtPayloadSchema = z.object({
  userId: z.string(),
  shopId: z.string(),
  role: z.enum(["OWNER", "ADMIN", "CASHIER"]),
});

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header missing" });
  }

  const token = authHeader.split(" ")[1]; // Remove "Bearer " prefix
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const result = jwtPayloadSchema.parse(decoded);

    req.user = {
      userId: result.userId,
      shopId: result.shopId,
      role: result.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
