import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authenticate } from "@middleware/authenticate";
import { authorise } from "@middleware/authorise";
import { rateLimiter } from "@middleware/rateLimiter";

const router = Router();

// public routes that require no auth
router.post(
  "/register",
  rateLimiter({ max: 5, windowMs: 60 * 60 * 1000 }), // 5 per 10 minutes
  AuthController.register,
);

router.post(
  "/login",
  rateLimiter({ max: 5, windowMs: 10 * 60 * 1000 }), // 5 per 10 minutes
  AuthController.login,
);

router.post(
  "/refresh",
  rateLimiter({ max: 20, windowMs: 60 * 1000 }), // 20 per minute
  AuthController.refresh,
);

// protected routes (auth required)
router.post("/logout", authenticate, AuthController.logout);

router.post(
  "/switch-shop",
  authenticate,
  authorise("OWNER"),
  AuthController.switchShop,
);

// staff management (owner only)

//  create staff member
router.post(
  "/staff",
  authenticate,
  authorise("OWNER"),
  rateLimiter({ max: 20, windowMs: 60 * 1000 }),
  AuthController.createStaff,
);

// Get all staff
router.get("/staff", authenticate, authorise("OWNER"), AuthController.getStaff);

// Update staff member
router.patch(
  "/staff/:id",
  authenticate,
  authorise("OWNER"),
  AuthController.updateStaff,
);

// Delete staff member
router.delete(
  "/staff/:id",
  authenticate,
  authorise("OWNER"),
  AuthController.deleteStaff,
);

// SHOP MANAGEMENT OWNER ONLY

// Create a new shop
router.post(
  "/shops",
  authenticate,
  authorise("OWNER"),
  rateLimiter({ max: 10, windowMs: 60 * 60 * 1000 }), // 10 per hour
  AuthController.createShop,
);

// Get all my shops
router.get(
  "/shops",
  authenticate,
  authorise("OWNER"),
  AuthController.getMyShops,
);

export default router;
