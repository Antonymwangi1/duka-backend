import { Response } from "express";
import { ZodError } from "zod";
import { AuthenticatedRequest } from "@custom-types/index";
import { handleError, handleZodError } from "@lib/handleError";
import { ReportsService } from "./reports.service";
import {
  ReportQuerySchema,
  TopProductsQuerySchema,
  StaffReportQuerySchema,
} from "./reports.schema";

export const ReportsController = {
  // ----------------------------------------------------------
  // SALES SUMMARY
  // ----------------------------------------------------------

  getSummary: async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Guard against null shopId
      if (!req.user!.shopId) {
        return res.status(400).json({
          message: "No shop selected. Please select a shop first.",
        });
      }

      const query = ReportQuerySchema.parse(req.query);

      const data = await ReportsService.getSummary(
        req.user!.shopId,
        req.user!.userId,
        query,
      );

      return res.status(200).json({
        report: "sales_summary",
        period: query.period,
        data,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // PROFIT REPORT
  // ----------------------------------------------------------

  getProfitReport: async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log("Reports req.user:", req.user);
      // Guard against null shopId
      if (!req.user!.shopId) {
        return res.status(400).json({
          message: "No shop selected. Please select a shop first.",
        });
      }
      const query = ReportQuerySchema.parse(req.query);

      const data = await ReportsService.getProfitReport(
        req.user!.shopId,
        req.user!.userId,
        query,
      );

      return res.status(200).json({
        report: "profit",
        period: query.period,
        data,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // TOP PRODUCTS
  // ----------------------------------------------------------

  getTopProducts: async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Guard against null shopId
      if (!req.user!.shopId) {
        return res.status(400).json({
          message: "No shop selected. Please select a shop first.",
        });
      }
      const query = TopProductsQuerySchema.parse(req.query);

      const data = await ReportsService.getTopProducts(
        req.user!.shopId,
        req.user!.userId,
        query,
      );

      return res.status(200).json({
        report: "top_products",
        period: query.period,
        data,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // STAFF PERFORMANCE
  // ----------------------------------------------------------

  getStaffPerformance: async (req: AuthenticatedRequest, res: Response) => {
    try {
      // Guard against null shopId
      if (!req.user!.shopId) {
        return res.status(400).json({
          message: "No shop selected. Please select a shop first.",
        });
      }
      const query = StaffReportQuerySchema.parse(req.query);

      const data = await ReportsService.getStaffPerformance(
        req.user!.shopId,
        req.user!.userId,
        query,
      );

      return res.status(200).json({
        report: "staff_performance",
        period: query.period,
        data,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  // ----------------------------------------------------------
  // LOW STOCK REPORT
  // ----------------------------------------------------------

  getLowStockReport: async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user!.shopId) {
        return res.status(400).json({
          message: "No shop selected. Please select a shop first.",
        });
      }

      const data = await ReportsService.getLowStockReport(req.user!.shopId);

      return res.status(200).json({
        report: "low_stock",
        data,
      });
    } catch (error) {
      return handleError(res, error);
    }
  },
};
