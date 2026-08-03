import { z } from "zod";

// PERIOD ENUM
export const PeriodEnum = z.enum(["daily", "weekly", "monthly"], {
  error: "Period must be daily, weekly or monthly",
});

// REPORT QUERY
export const ReportQuerySchema = z.object({
  period: PeriodEnum.default("daily"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),

  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be in YYYY-MM-DD format")
    .optional(),

  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be in YYYY-MM-DD format")
    .optional(),
});

// TOP PRODUCTS QUERY
export const TopProductsQuerySchema = z.object({
  period: PeriodEnum.default("daily"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(50))
    .default(10),
});

// STAFF REPORT QUERY
export const StaffReportQuerySchema = z.object({
  period: PeriodEnum.default("daily"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .optional(),

  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format")
    .optional(),
});

export type ReportQuery = z.infer<typeof ReportQuerySchema>;
export type TopProductsQuery = z.infer<typeof TopProductsQuerySchema>;
export type StaffReportQuery = z.infer<typeof StaffReportQuerySchema>;
export type Period = z.infer<typeof PeriodEnum>;
