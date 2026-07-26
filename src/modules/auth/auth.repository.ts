import { prisma } from "@lib/prisma";
import {
  RegisterInput,
  CreateStaffInput,
  UpdateStaffInput,
} from "./auth.schema";
import { Currency } from "@prisma/client";

// User queries
export const AuthRepository = {
  // find user by email
  findUserByEmail: async (email: string) => {
    return prisma.user.findUnique({
      where: { email },
    });
  },

  // find user by ID
  findUserById: async (id: string) => {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        role: true,
        shopId: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  // find staff belonging to a shop
  findStaffByShopId: async (shopId: string) => {
    return prisma.user.findMany({
      where: {
        shopId,
        role: { in: ["ADMIN", "CASHIER"] },
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  // find single staff member by ID
  findStaffById: async (id: string, shopId: string) => {
    return prisma.user.findFirst({
      where: {
        id,
        shopId,
        role: { in: ["ADMIN", "CASHIER"] },
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  // create owner account
  createOwner: async (data: {
    fullname: string;
    email: string;
    phone: string;
    passwordHash: string;
  }) => {
    return prisma.user.create({
      data: {
        ...data,
        role: "OWNER",
        isActive: true,
      },
    });
  },

  // create staff account
  createStaff: async (data: {
    fullname: string;
    email: string;
    phone: string;
    passwordHash: string;
    role: "ADMIN" | "CASHIER";
    shopId: string;
  }) => {
    return prisma.user.create({
      data: {
        ...data,
        isActive: true,
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        role: true,
        shopId: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  // Update staff role or active status
  updateStaff: async (id: string, shopId: string, data: UpdateStaffInput) => {
    return prisma.user.update({
      where: { id },
      data: {
        ...(data.role !== undefined && { role: data.role }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  },

  // Delete staff member
  deleteStaff: async (id: string, shopId: string) => {
    return prisma.user.delete({
      where: { id },
    });
  },

  // shop quereies

  // Create shop
  createShop: async (data: {
    shopName: string;
    address: string;
    phone: string;
    currency: Currency;
    ownerId: string;
  }) => {
    return prisma.shop.create({
      data,
    });
  },

  // Find shop by ID
  findShopById: async (id: string) => {
    return prisma.shop.findUnique({
      where: { id },
    });
  },

  // Find all shops owned by a user
  findShopsByOwnerId: async (ownerId: string) => {
    return prisma.shop.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        shopName: true,
        address: true,
        phone: true,
        currency: true,
        plan: true,
        isActive: true,
        createdAt: true,
      },
    });
  },

  // check if shop phone already exists
  findShopByPhone: async (phone: string) => {
    return prisma.shop.findUnique({
      where: { phone },
    });
  },
};
