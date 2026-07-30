import { Router } from "express";
import { SalesController } from "./sales.controller";
import { authenticate } from "@middleware/authenticate";
import { authorise } from "@middleware/authorise";
import { rateLimiter } from "@middleware/rateLimiter";

const router = Router();

// Create a sale all authenticated roles
router.post(
  "/",
  authenticate,
  rateLimiter({ max: 60, windowMs: 60 * 1000 }), // 60 per minute
  SalesController.createSale,
);

// List all sales. owner and admin only
router.get(
  "/",
  authenticate,
  authorise("OWNER", "ADMIN"),
  SalesController.listSales,
);

// Get single sale all authenticated roles
// Must be before /:id/receipt and /:id/reverse
router.get("/:id", authenticate, SalesController.getSale);

// Get receipt all authenticated roles
router.get("/:id/receipt", authenticate, SalesController.getReceipt);

// Reverse sale owner and admin only
router.post(
  "/:id/reverse",
  authenticate,
  authorise("OWNER", "ADMIN"),
  rateLimiter({ max: 10, windowMs: 60 * 1000 }), // 10 per minute
  SalesController.reverseSale,
);

export default router;
