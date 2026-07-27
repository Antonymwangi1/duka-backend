import { Response } from "express";
import { ZodError } from "zod";

export const handleError = (res: Response, error: unknown) => {
  if (error instanceof Error) {
    switch (error.message) {
      case "EMAIL_TAKEN":
        return res.status(409).json({
          message: "An account with this email already exists",
        });
      case "INVALID_CREDENTIALS":
        return res.status(401).json({
          message: "Invalid email or password",
        });
      case "ACCOUNT_DISABLED":
        return res.status(403).json({
          message: "Your account has been disabled. Contact your shop owner.",
        });
      case "INVALID_REFRESH_TOKEN":
        return res.status(401).json({
          message: "Session expired. Please login again.",
        });
      case "USER_NOT_FOUND":
        return res.status(404).json({
          message: "User not found",
        });
      case "SHOP_NOT_FOUND":
        return res.status(404).json({
          message: "Shop not found",
        });
      case "SHOP_PHONE_TAKEN":
        return res.status(409).json({
          message: "A shop with this phone number already exists",
        });
      case "STAFF_NOT_FOUND":
        return res.status(404).json({
          message: "Staff member not found",
        });
      case "PRODUCT_NOT_FOUND":
        return res.status(404).json({
          message: "Product not found",
        });
      case "CATEGORY_NOT_FOUND":
        return res.status(404).json({
          message: "Category not found",
        });
      case "DUPLICATE_CATEGORY":
        return res.status(409).json({
          message: "A category with this name already exists in your shop",
        });
      case "SALE_NOT_FOUND":
        return res.status(404).json({
          message: "Sale not found",
        });
      case "INSUFFICIENT_STOCK":
        return res.status(400).json({
          message: "Insufficient stock for one or more items",
        });
      case "FORBIDDEN":
        return res.status(403).json({
          message: "You do not have permission to perform this action",
        });
      case "DUPLICATE_SKU":
        return res.status(409).json({
          message: "A product with this SKU already exists in your shop",
        });
      case "DUPLICATE_BARCODE":
        return res.status(409).json({
          message: "A product with this barcode already exists in your shop",
        });
      default:
        console.error("Unhandled error:", error);
        return res.status(500).json({
          message: "Something went wrong. Please try again.",
        });
    }
  }

  console.error("Unknown error:", error);
  return res.status(500).json({
    message: "Something went wrong. Please try again.",
  });
};

export const handleZodError = (res: Response, error: unknown) => {
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: "Validation failed",
      errors: error.issues.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }
  return null;
};
