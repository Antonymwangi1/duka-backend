import { z } from "zod";

// SALE ITEM

export const SaleItemSchema = z.object({
  productId: z.uuid({ error: "Invalid product ID" }),

  quantity: z
    .number({ error: "Quantity is required" })
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
});

// CREATE SALE

export const CreateSaleSchema = z.object({
  items: z.array(SaleItemSchema).min(1, "Sale must have at least one item"),

  paymentMethod: z.enum(["CASH", "MPESA"], {
    error: "Payment method must be CASH or MPESA",
  }),

  discount: z
    .number()
    .min(0, "Discount cannot be negative")
    .max(100, "Discount cannot exceed 100 percent")
    .default(0),

  notes: z
    .string()
    .max(500, "Notes must not exceed 500 characters")
    .trim()
    .optional(),
});

// LIST SALES QUERY
export const ListSalesQuerySchema = z.object({
  staffId: z.uuid("Invalid staff ID").optional(),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
    .optional(),

  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
    .optional(),

  page: z.string().transform(Number).pipe(z.number().int().min(1)).default(1),

  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default(20),
});

// REVERSE SALE
export const ReverseSaleSchema = z.object({
  reason: z
    .string({ error: "Reason is required" })
    .min(5, "Reason must be at least 5 characters")
    .max(500, "Reason must not exceed 500 characters")
    .trim(),

  items: z
    .array(
      z.object({
        saleItemId: z.uuid({ error: "Invalid sale item ID" }),
        quantity: z
          .number({ error: "Quantity is required" })
          .int("Quantity must be a whole number")
          .positive("Quantity must be greater than 0"),
      }),
    )
    .min(1, "At least one item must be reversed")
    .optional(),
});

export type SaleItemInput = z.infer<typeof SaleItemSchema>;
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
export type ListSalesQuery = z.infer<typeof ListSalesQuerySchema>;
export type ReverseSaleInput = z.infer<typeof ReverseSaleSchema>;
