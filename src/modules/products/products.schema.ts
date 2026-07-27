import { z } from "zod";
import { Currency } from "@prisma/client";

// CREATE PRODUCT

export const CreateProductSchema = z
  .object({
    name: z
      .string({ error: "Product name is required" })
      .min(1, "Product name must be at least 1 character")
      .max(255, "Product name must not exceed 255 characters")
      .trim(),

    description: z
      .string()
      .max(1000, "Description must not exceed 1000 characters")
      .trim()
      .optional(),

    categoryId: z.uuid({ error: "Invalid category ID" }).optional(),

    sku: z
      .string()
      .max(100, "SKU must not exceed 100 characters")
      .trim()
      .optional(),

    barcode: z
      .string()
      .max(100, "Barcode must not exceed 100 characters")
      .trim()
      .optional(),

    unit: z
      .string({ error: "Unit is required" })
      .min(1, "Unit must be at least 1 character")
      .max(50, "Unit must not exceed 50 characters")
      .trim()
      .optional(),

    buyingPrice: z
      .number({ error: "Buying price is required" })
      .positive("Buying price must be greater than 0")
      .multipleOf(0.01, "Buying price must have at most 2 decimal places"),

    sellingPrice: z
      .number({ error: "Selling price is required" })
      .positive("Selling price must be greater than 0")
      .multipleOf(0.01, "Selling price must have at most 2 decimal places"),

    stockQuantity: z
      .number({ error: "Stock quantity is required" })
      .int("Stock quantity must be a whole number")
      .min(0, "Stock quantity cannot be negative")
      .default(0),

    lowStockThreshold: z
      .number()
      .int("Low stock threshold must be a whole number")
      .min(0, "Low stock threshold cannot be negative")
      .optional(),

    imageUrl: z.url("Invalid image URL").optional(),
  })
  .refine((data) => data.sellingPrice >= data.buyingPrice, {
    message: "Selling price must be greater than or equal to buying price",
    path: ["sellingPrice"],
  });

// UPDATE PRODUCT

export const UpdateProductSchema = z
  .object({
    name: z
      .string()
      .min(1, "Product name must be at least 1 character")
      .max(255, "Product name must not exceed 255 characters")
      .trim()
      .optional(),

    description: z
      .string()
      .max(1000, "Description must not exceed 1000 characters")
      .trim()
      .optional(),

    categoryId: z.uuid("Invalid category ID").optional(),

    sku: z
      .string()
      .max(100, "SKU must not exceed 100 characters")
      .trim()
      .optional(),

    barcode: z
      .string()
      .max(100, "Barcode must not exceed 100 characters")
      .trim()
      .optional(),

    unit: z
      .string()
      .max(50, "Unit must not exceed 50 characters")
      .trim()
      .optional(),

    buyingPrice: z
      .number()
      .positive("Buying price must be greater than 0")
      .multipleOf(0.01, "Buying price must have at most 2 decimal places")
      .optional(),

    sellingPrice: z
      .number()
      .positive("Selling price must be greater than 0")
      .multipleOf(0.01, "Selling price must have at most 2 decimal places")
      .optional(),

    lowStockThreshold: z
      .number()
      .int("Low stock threshold must be a whole number")
      .min(0, "Low stock threshold cannot be negative")
      .optional(),

    imageUrl: z.url("Invalid image URL").optional(),
  })
  .refine(
    (data) => {
      if (data.sellingPrice && data.buyingPrice) {
        return data.sellingPrice >= data.buyingPrice;
      }
      return true;
    },
    {
      message: "Selling price must be greater than or equal to buying price",
      path: ["sellingPrice"],
    },
  )
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

// ADJUST STOCK

export const AdjustStockSchema = z.object({
  quantity: z
    .number({ error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .refine((val) => val !== 0, "Quantity cannot be zero"),

  movementType: z.enum(["RESTOCK", "ADJUSTMENT", "DAMAGE"], {
    error: "Movement type must be RESTOCK, ADJUSTMENT or DAMAGE",
  }),

  notes: z
    .string()
    .max(500, "Notes must not exceed 500 characters")
    .trim()
    .optional(),
});

// CREATE CATEGORY

export const CreateCategorySchema = z.object({
  name: z
    .string({ error: "Category name is required" })
    .min(1, "Category name must be at least 1 character")
    .max(100, "Category name must not exceed 100 characters")
    .trim(),
});

// SEARCH QUERY

export const SearchQuerySchema = z
  .object({
    q: z
      .string()
      .min(1, "Search query must be at least 1 character")
      .trim()
      .optional(),

    barcode: z.string().trim().optional(),

    categoryId: z.uuid("Invalid category ID").optional(),

    page: z.string().transform(Number).pipe(z.number().int().min(1)).default(1),

    limit: z
      .string()
      .transform(Number)
      .pipe(z.number().int().min(1).max(100))
      .default(20),
  })
  .refine((data) => data.q || data.barcode || data.categoryId, {
    message: "At least one search parameter must be provided",
  });

// INFERRED TYPES

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type AdjustStockInput = z.infer<typeof AdjustStockSchema>;
export type CreateCategoryInput = z.infer<typeof CreateCategorySchema>;
export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
