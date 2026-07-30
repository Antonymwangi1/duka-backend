import { Response } from "express";
import { ZodError } from "zod";
import { AuthenticatedRequest } from "@custom-types/index";
import { handleError, handleZodError } from "@lib/handleError";
import { SalesService } from "./sales.service";
import {
  CreateSaleSchema,
  ListSalesQuerySchema,
  ReverseSaleSchema,
} from "./sales.schema";

export const SalesController = {
  // ----------------------------------------------------------
  // CREATE SALE
  // ----------------------------------------------------------

  createSale: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = CreateSaleSchema.parse(req.body);

      const sale = await SalesService.createSale(
        req.user!.shopId,
        req.user!.userId,
        body,
      );

      return res.status(201).json({
        message: "Sale created successfully",
        sale,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // LIST SALES

  listSales: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const query = ListSalesQuerySchema.parse(req.query);

      const result = await SalesService.listSales(req.user!.shopId, query);

      return res.status(200).json(result);
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // GET SINGLE SALE

  getSale: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const sale = await SalesService.getSale(
        req.params.id as string,
        req.user!.shopId,
      );

      return res.status(200).json({ sale });
    } catch (error) {
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // GET RECEIPT

  getReceipt: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const receipt = await SalesService.getReceipt(
        req.params.id as string,
        req.user!.shopId,
      );

      return res.status(200).json({ receipt });
    } catch (error) {
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // REVERSE SALE

  reverseSale: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = ReverseSaleSchema.parse(req.body);

      const result = await SalesService.reverseSale(
        req.params.id as string,
        req.user!.shopId,
        req.user!.userId,
        body,
      );

      return res.status(200).json({
        message: "Sale reversed successfully",
        result,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },
};
