import { z } from "zod";
import { Currency } from "@prisma/client";

//  Register

export const RegisterSchema = z.object({
  // owner details
  fullname: z
    .string({ error: "full name is required" })
    .min(2, "full name must be a least 2 characters")
    .max(100, "full name must not exceed 100 characters")
    .trim(),

  email: z
    .email({
      error: (issue) =>
        issue.input === "" ? "Email field is required" : "Invalid email format",
    })
    .toLowerCase()
    .trim(),

  phone: z
    .string({ error: "phone number is required" })
    .regex(/^(\+254|0)[17]\d{8}$/, "Invalid Kenyan phone number")
    .trim(),

  password: z
    .string({ error: "password is required" })
    .min(8, "password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

  // Shop details
  shopName: z
    .string({ error: "shop name is required" })
    .min(2, "shop name must be at least 2 characters")
    .max(100, "shop name must not exceed 100 characters")
    .trim(),

  address: z
    .string({ error: "address is required" })
    .min(5, "address must be at least 5 characters")
    .trim(),

  shopPhone: z
    .string({ error: "shop phone number is required" })
    .regex(/^(\+254|0)[17]\d{8}$/, "Invalid Kenyan phone number")
    .trim(),

  currency: z.enum(Currency).default(Currency.KES),
});

// Login
export const LoginSchema = z.object({
  email: z
    .email({
      error: (issue) =>
        issue.input === "" ? "Email field is required" : "Invalid email format",
    })
    .toLowerCase()
    .trim(),

  password: z
    .string({ error: "password is required" })
    .min(1, "password is required"),
});

// Create Staff
export const CreateStaffSchema = z.object({
  fullname: z
    .string({ error: "full name is required" })
    .min(2, "full name must be a least 2 characters")
    .max(100, "full name must not exceed 100 characters")
    .trim(),

  email: z
    .email({
      error: (issue) =>
        issue.input === "" ? "Email field is required" : "Invalid email format",
    })
    .toLowerCase()
    .trim(),

  phone: z
    .string({ error: "phone number is required" })
    .regex(/^(\+254|0)[17]\d{8}$/, "Invalid Kenyan phone number")
    .trim(),

  password: z
    .string({ error: "password is required" })
    .min(8, "password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),

  role: z.enum(["ADMIN", "CASHIER"], {
    error: "Role must be either 'ADMIN' or 'CASHIER'",
  }),
});

// Update Staff
export const UpdateStaffSchema = z
  .object({
    role: z.enum(["ADMIN", "CASHIER"]).optional(),

    isActive: z.boolean().optional(),
  })
  .refine((data) => data.role !== undefined || data.isActive !== undefined, {
    message: "At least one field must be provided",
  });

// Switch shop
export const SwitchShopSchema = z.object({
  shopId: z.uuid({
    error: "Invalid shop ID",
  }),
});

// create shop
export const CreateShopSchema = z.object({
  shopName: z
    .string({ error: "Shop name is required" })
    .min(2, "Shop name must be at least 2 characters")
    .max(100, "Shop name must not exceed 100 characters")
    .trim(),

  address: z
    .string({ error: "Address is required" })
    .min(2, "Address must be at least 2 characters")
    .trim(),

  shopPhone: z
    .string({ error: "Shop phone is required" })
    .regex(/^(\+254|0)[17]\d{8}$/, "Invalid Kenyan phone number")
    .trim(),

  currency: z.enum(Currency).default(Currency.KES),
});

// inferred types
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;
export type SwitchShopInput = z.infer<typeof SwitchShopSchema>;
export type CreateShopInput = z.infer<typeof CreateShopSchema>;
