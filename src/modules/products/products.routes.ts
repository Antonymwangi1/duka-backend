import { Router } from "express";
import { ProductsController } from "./products.controller";
import { authenticate } from "@middleware/authenticate";
import { authorise } from "@middleware/authorise";
import { rateLimiter } from "@middleware/rateLimiter";

const router = Router();

// CATEGORY ROUTES

// Create category
router.post(
  "/categories",
  authenticate,
  authorise("OWNER", "ADMIN"),
  ProductsController.createCategory,
);

// Get all categories
router.get("/categories", authenticate, ProductsController.getCategories);

// Delete category
router.delete(
  "/categories/:id",
  authenticate,
  authorise("OWNER", "ADMIN"),
  ProductsController.deleteCategory,
);

// PRODUCT ROUTES

// Search products must be before /:id to avoid route conflict
router.get(
  "/search",
  authenticate,
  rateLimiter({ max: 60, windowMs: 60 * 1000 }), // 60 per minute
  ProductsController.searchProducts,
);

// Get low stock products must be before /:id
router.get("/low-stock", authenticate, ProductsController.getLowStockProducts);

// Create product
router.post(
  "/",
  authenticate,
  authorise("OWNER", "ADMIN"),
  ProductsController.createProduct,
);

// Get all products
router.get("/", authenticate, ProductsController.getProducts);

// Get single product
router.get("/:id", authenticate, ProductsController.getProduct);

// Update product
router.patch(
  "/:id",
  authenticate,
  authorise("OWNER", "ADMIN"),
  ProductsController.updateProduct,
);

// Soft delete product
router.delete(
  "/:id",
  authenticate,
  authorise("OWNER", "ADMIN"),
  ProductsController.deleteProduct,
);

// Adjust stock
router.patch(
  "/:id/stock",
  authenticate,
  authorise("OWNER", "ADMIN"),
  ProductsController.adjustStock,
);

export default router;
