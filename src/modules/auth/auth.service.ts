import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@lib/prisma";
import { AuthRepository } from "./auth.repository";
import {
  RegisterInput,
  LoginInput,
  CreateStaffInput,
  UpdateStaffInput,
  SwitchShopInput,
  CreateShopInput,
} from "./auth.schema";

// Token Helpers --------------------------------------------

const generateAccessToken = (payload: {
  userId: string;
  shopId: string | null;
  role: string;
}) => {
  return jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: "15m",
  });
};

const generateRefreshToken = (payload: { userId: string }) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET as string, {
    expiresIn: "7d",
  });
};

// Auth Service ---------------------------------------------

export const AuthService = {
  // REGISTER
  register: async (data: RegisterInput) => {
    // check if email already exists
    const existingUser = await AuthRepository.findUserByEmail(data.email);

    if (existingUser) {
      throw new Error("EMAIL_TAKEN");
    }

    // hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

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

    // generate tokens
    const accessToken = generateAccessToken({
      userId: result.owner.id,
      shopId: result.shop.id,
      role: "OWNER",
    });

    const refreshToken = generateRefreshToken({
      userId: result.owner.id,
    });

    // return tokens and user data
    return {
      accessToken,
      refreshToken,
      user: {
        id: result.owner.id,
        fullname: result.owner.fullname,
        email: result.owner.email,
        phone: result.owner.phone,
        role: result.owner.role,
      },
      shop: {
        id: result.shop.id,
        shopName: result.shop.shopName,
        address: result.shop.address,
        currency: result.shop.currency,
      },
    };
  },

  // LOGIN
  login: async (data: LoginInput) => {
    // check if user exists
    const user = await AuthRepository.findUserByEmail(data.email);
    if (!user) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // check account is active
    if (!user.isActive) {
      throw new Error("ACCOUNT_DISABLED");
    }

    // verify password
    const passwordMatch = await bcrypt.compare(
      data.password,
      user.passwordHash,
    );
    if (!passwordMatch) {
      throw new Error("INVALID_CREDENTIALS");
    }

    // Determine shopId for JWT
    // staff -> user their assigned shopId
    // owner -> fetch their shops and handle selection
    let shopId: string | null = null;

    if (user.role === "OWNER") {
      const shops = await AuthRepository.findShopsByOwnerId(user.id);

      if (shops.length === 1) {
        // single shop owner auto select
        shopId = shops[0].id;
      }

      // multiple shops, shopId stays null
      // frontend will show shop selector
    } else {
      // staff always has a shopId
      shopId = user.shopId;
    }

    // generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      shopId,
      role: user.role,
    });

    const refreshToken = generateRefreshToken({
      userId: user.id,
    });

    // return response
    return {
      accessToken,
      refreshToken,
      requiresShopSelection: user.role === "OWNER" && shopId === null,
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        shopId,
      },
    };
  },

  // REFRESH TOKEN
  refresh: async (refreshToken: string) => {
    // verify refresh token
    let decoded: { userId: string };

    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET as string,
      ) as { userId: string };
    } catch {
      throw new Error("INVALID_REFRESH_TOKEN");
    }

    // find user
    const user = await AuthRepository.findUserById(decoded.userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // check account is still active
    if (!user.isActive) {
      throw new Error("ACCOUNT_DISABLED");
    }

    // Determine shopId
    // Staff have shopId on their user record
    // Owners have shopId linked via shops.ownerId
    let shopId: string | null = user.shopId ?? null

    if (user.role === 'OWNER' && !shopId) {
        // Fetch owner's shops
        const shops = await AuthRepository.findShopsByOwnerId(user.id)
        if (shops.length === 1) {
            // Single shop owner — auto select
            shopId = shops[0].id
        }
        // Multiple shops → shopId stays null
        // Frontend will show shop selector
    }

    // generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      shopId: user.shopId ?? null,
      role: user.role,
    });

    return { accessToken };
  },

  // SWITCH SHOP (owner only)
  switchShop: async (userId: string, data: SwitchShopInput) => {
    // verify shop belongs to this owner
    const shop = await AuthRepository.findShopById(data.shopId);
    if (!shop) {
      throw new Error("SHOP_NOT_FOUND");
    }

    if (shop.ownerId !== userId) {
      throw new Error("FORBIDDEN");
    }

    // get user details
    const user = await AuthRepository.findUserById(userId);
    if (!user) {
      throw new Error("USER_NOT_FOUND");
    }

    // new access token with selected shopId
    const accessToken = generateAccessToken({
      userId: user.id,
      shopId: data.shopId,
      role: user.role,
    });

    return {
      accessToken,
      shop: {
        id: shop.id,
        shopName: shop.shopName,
      },
    };
  },

  // CREATE NEW SHOP (for existing owner)
  createShop: async (ownerId: string, data: CreateShopInput) => {
    // check if shop phon already taken
    const existingShop = await AuthRepository.findShopByPhone(data.shopPhone);
    if (existingShop) {
      throw new Error("SHOP_PHONE_TAKEN");
    }

    // create shop
    const shop = await AuthRepository.createShop({
      shopName: data.shopName,
      address: data.address,
      phone: data.shopPhone,
      currency: data.currency,
      ownerId,
    });

    // Issue new access token scoped to new shop
    const accessToken = generateAccessToken({
      userId: ownerId,
      shopId: shop.id,
      role: "OWNER",
    });

    return { shop, accessToken };
  },

  // GET ALL MY SHOPS
  getMyShops: async (ownerId: string) => {
    return AuthRepository.findShopsByOwnerId(ownerId);
  },

  // CREATE STAFF
  createStaff: async (data: CreateStaffInput, shopId: string) => {
    // Check email not already taken
    const existingUser = await AuthRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("EMAIL_TAKEN");
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    // Create staff
    const staff = await AuthRepository.createStaff({
      fullname: data.fullname,
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      shopId,
    });

    return staff;
  },

  //  GET ALL STAFF
  getStaff: async (shopId: string) => {
    return AuthRepository.findStaffByShopId(shopId);
  },

  // UPDATE STAFF
  updateStaff: async (
    staffId: string,
    shopId: string,
    data: UpdateStaffInput,
  ) => {
    // 1. Check staff exists and belongs to this shop
    const staff = await AuthRepository.findStaffById(staffId, shopId);
    if (!staff) {
      throw new Error("STAFF_NOT_FOUND");
    }

    // 2. Update
    return AuthRepository.updateStaff(staffId, shopId, data);
  },

  // DELETE STAFF
  deleteStaff: async (staffId: string, shopId: string) => {
    // 1. Check staff exists and belongs to this shop
    const staff = await AuthRepository.findStaffById(staffId, shopId);
    if (!staff) {
      throw new Error("STAFF_NOT_FOUND");
    }

    // 2. Delete
    return AuthRepository.deleteStaff(staffId, shopId);
  },
};
