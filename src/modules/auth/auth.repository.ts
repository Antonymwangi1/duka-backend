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

  // create owner and shop account in one transaction
  createOwnerAndShop: async (data: RegisterInput, passwordHash: string) => {
    // create owner and shop in one transaction
    const result = await prisma.$transaction(async (tx) => {
      // create owner first
      const owner = await tx.user.create({
        data: {
          fullname: data.fullname,
          email: data.email,
          phone: data.phone,
          passwordHash,
          role: "OWNER",
          isActive: true,
        },
      });

      // create shop with owner reference
      const shop = await tx.shop.create({
        data: {
          shopName: data.shopName,
          address: data.address,
          phone: data.shopPhone,
          currency: data.currency,
          ownerId: owner.id,
        },
      });

      return { owner, shop };
    });

    return result;
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

  // shop queries

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

  storeAndInvalidateEmailVerificationToken: async (
    userId: string,
    tokenHash: string,
    expiresAt: Date,
  ) => {
    return prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.emailVerificationToken.updateMany({
        where: {
          userId,
          usedAt: null,
        },
        data: {
          expiresAt: now,
        },
      });

      return tx.emailVerificationToken.create({
        data: {
          userId,
          tokenHash,
          expiresAt,
        },
      });
    });
  },

  // mark user as verified and verification token as used
  markUserAsVerified: async (userId: string, tokenHash: string) => {
    return prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { emailVerifiedAt: new Date() },
      });

      await tx.emailVerificationToken.update({
        where: {
          userId,
          tokenHash,
          usedAt: null,
        },
        data: {
          usedAt: new Date(),
        },
      });
    });
  },

  // find email verification token by hash
  findEmailVerificationTokenByHash: async (tokenHash: string) => {
    return prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });
  },
};
