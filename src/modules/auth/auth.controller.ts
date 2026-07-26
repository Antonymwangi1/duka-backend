import { Request, Response } from "express";
import { ZodError } from "zod";
import { AuthService } from "./auth.service";
import {
  RegisterSchema,
  LoginSchema,
  CreateStaffSchema,
  UpdateStaffSchema,
  SwitchShopSchema,
  CreateShopSchema,
} from "./auth.schema";
import { AuthenticatedRequest } from "@custom-types/index";
import { handleError, handleZodError } from "@lib/handleError";
import { resolve } from "node:dns";

// COOKIE CONFIG
const REFRESH_TOKEN_COOKIE = "refresh_token";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

// CONTROLLERS
export const AuthController = {
  // REGISTER
  register: async (req: Request, res: Response) => {
    try {
      // validate request body
      const body = RegisterSchema.parse(req.body);

      // call service
      const result = await AuthService.register(body);

      // set refresh token in HTTP only cookie
      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, cookieOptions);

      // return response
      return res.status(201).json({
        message: "Account created successfully",
        accessToken: result.accessToken,
        user: result.user,
        shop: result.shop,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      return handleError(res, error);
    }
  },

  // LOGIN
  login: async (req: Request, res: Response) => {
    try {
      // validate request body
      const body = LoginSchema.parse(req.body);

      // call service
      const result = await AuthService.login(body);

      // set refresh token in http only cookie
      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, cookieOptions);

      // return response
      return res.status(200).json({
        message: "Login successful",
        accessToken: result.accessToken,
        requireShopSelection: result.requiresShopSelection,
        user: result.user,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      return handleError(res, error);
    }
  },

  // LOGOUT
  logout: async (req: Request, res: Response) => {
    try {
      // Clear the refresh token cookie
      res.clearCookie(REFRESH_TOKEN_COOKIE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict" as const,
      });

      return res.status(200).json({
        message: "Logged out successfully",
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  // REFRESH TOKEN
  refresh: async (req: Request, res: Response) => {
    try {
      // get refresh token from cookie
      const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE];

      if (!refreshToken) {
        return res.status(401).json({
          message: "No refresh token provided",
        });
      }

      // call service
      const result = await AuthService.refresh(refreshToken);

      // return new access token
      return res.status(200).json({
        accessToken: result.accessToken,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  // SWITCH SHOP
  switchShop: async (req: AuthenticatedRequest, res: Response) => {
    try {
      // validate request body
      const body = SwitchShopSchema.parse(req.body);

      // call service
      const result = await AuthService.switchShop(req.user!.userId, body);

      // return new access token
      return res.status(200).json({
        messsage: "Shop switch successfully",
        accessToken: result.accessToken,
        shop: result.shop,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      return handleError(res, error);
    }
  },

  // CREATE NEW SHOP
  createShop: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = CreateShopSchema.parse(req.body);

      const result = await AuthService.createShop(req.user!.userId, body);

      return res.status(201).json({
        message: "Shop created successfully",
        accessToken: result.accessToken,
        shop: result.shop,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  // GET MY SHOPS

  getMyShops: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const shops = await AuthService.getMyShops(req.user!.userId);

      return res.status(200).json({ shops });
    } catch (error) {
      return handleError(res, error);
    }
  },

  // CREATE STAFF
  createStaff: async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Validate request body
      const body = CreateStaffSchema.parse(req.body);

      // Call service
      const staff = await AuthService.createStaff(body, req.user!.shopId);

      // Return response
      return res.status(201).json({
        message: "Staff member created successfully",
        staff,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      return handleError(res, error);
    }
  },

  // GET STAFF
  getStaff: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const staff = await AuthService.getStaff(req.user!.shopId);

      return res.status(200).json({ staff });
    } catch (error) {
      return handleError(res, error);
    }
  },

  // UPDATE STAFF
  updateStaff: async (req: AuthenticatedRequest, res: Response) => {
    try {
      // validate request body
      const body = UpdateStaffSchema.parse(req.body);

      // Call service
      const staff = await AuthService.updateStaff(
        req.params.id as string,
        req.user!.shopId,
        body,
      );

      // Return response
      return res.status(200).json({
        message: "Staff member updated successfully",
        staff,
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(res, error);
      }
      return handleError(res, error);
    }
  },

  // DELETE STAFF
  deleteStaff: async (req: AuthenticatedRequest, res: Response) => {
    try {
      await AuthService.deleteStaff(req.params.id as string, req.user!.shopId);

      return res.status(200).json({
        message: "Staff member removed successfully",
      });
    } catch (error) {
      return handleError(res, error);
    }
  },
};
