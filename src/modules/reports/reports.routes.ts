import { Router } from "express";
import { ReportsController } from "./reports.controller";
import { authenticate } from "@middleware/authenticate";
import { authorise } from "@middleware/authorise";
import { rateLimiter } from "@middleware/rateLimiter";

const router = Router();

// All reports require authentication
// Owner and Admin only cashiers have no access to reports

// Sales summary
router.get(
  "/summary",
  authenticate,
  authorise("OWNER", "ADMIN"),
  rateLimiter({ max: 30, windowMs: 60 * 1000 }), // 30 per minute
  ReportsController.getSummary,
);

// Profit report
router.get(
  "/profit",
  authenticate,
  authorise("OWNER", "ADMIN"),
  rateLimiter({ max: 30, windowMs: 60 * 1000 }),
  ReportsController.getProfitReport,
);

// Top products
router.get(
  "/top-products",
  authenticate,
  authorise("OWNER", "ADMIN"),
  rateLimiter({ max: 30, windowMs: 60 * 1000 }),
  ReportsController.getTopProducts,
);

// Staff performance — owner only
router.get(
  "/staff",
  authenticate,
  authorise("OWNER"),
  rateLimiter({ max: 30, windowMs: 60 * 1000 }),
  ReportsController.getStaffPerformance,
);

// Low stock report
router.get(
  "/low-stock",
  authenticate,
  authorise("OWNER", "ADMIN"),
  rateLimiter({ max: 30, windowMs: 60 * 1000 }),
  ReportsController.getLowStockReport,
);

export default router;
