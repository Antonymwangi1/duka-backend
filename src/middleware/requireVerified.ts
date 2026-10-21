import { Response, NextFunction } from "express";
import { AuthRepository } from "@modules/auth/auth.repository";
import { AuthenticatedRequest } from "@custom-types/index";

export const requireVerified = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await AuthRepository.findUserById(req.user.userId);

    if (!user?.emailVerifiedAt) {
      return res.status(403).json({
        code: "EMAIL_NOT_VERIFIED",
        message: "Please verify your email to continue",
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};
