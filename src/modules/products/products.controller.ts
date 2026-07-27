import { Response } from "express";
import { ZodError } from "zod";
import { AuthenticatedRequest } from "@custom-types/index";
import { handleError, handleZodError } from "@lib/handleError";
import { ProductsService } from "./products.service";
import {
  CreateProductSchema,
  UpdateProductSchema,
  AdjustStockSchema,
  CreateCategorySchema,
  SearchQuerySchema,
} from "./products.schema";

export const ProductsController = {
  // CATEGORIES

  createCategory: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = CreateCategorySchema.parse(req.body);

      const category = await ProductsService.createCategory(
        req.user!.shopId,
        body,
      );

      return res.status(201).json({
        message: "Category created successfully",
        category,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  getCategories: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const categories = await ProductsService.getCategories(req.user!.shopId);

      return res.status(200).json({ categories });
    } catch (error) {
      return handleError(res, error);
    }
  },

  deleteCategory: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const id = req.params.id as string;
      await ProductsService.deleteCategory(id, req.user!.shopId);

      return res.status(200).json({
        message: "Category deleted successfully",
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  // PRODUCTS

  createProduct: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = CreateProductSchema.parse(req.body);

      const product = await ProductsService.createProduct(
        req.user!.shopId,
        body,
      );

      return res.status(201).json({
        message: "Product created successfully",
        product,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  getProducts: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;

      const result = await ProductsService.getProducts(
        req.user!.shopId,
        page,
        limit,
      );

      return res.status(200).json(result);
    } catch (error) {
      return handleError(res, error);
    }
  },

  getProduct: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const product = await ProductsService.getProduct(
        req.params.id as string,
        req.user!.shopId,
      );

      return res.status(200).json({ product });
    } catch (error) {
      return handleError(res, error);
    }
  },

  searchProducts: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { q, barcode, page, limit } = SearchQuerySchema.parse(req.query);

      // Barcode search returns single product
      if (barcode) {
        const product = await ProductsService.searchByBarcode(
          barcode,
          req.user!.shopId,
        );
        return res.status(200).json({ product });
      }

      // Name search returns paginated list
      if (q) {
        const result = await ProductsService.searchProducts(
          req.user!.shopId,
          q,
          page,
          limit,
        );
        return res.status(200).json(result);
      }
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  getLowStockProducts: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const products = await ProductsService.getLowStockProducts(
        req.user!.shopId,
      );

      return res.status(200).json({ products });
    } catch (error) {
      return handleError(res, error);
    }
  },

  updateProduct: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = UpdateProductSchema.parse(req.body);

      const product = await ProductsService.updateProduct(
        req.params.id as string,
        req.user!.shopId,
        body,
      );

      return res.status(200).json({
        message: "Product updated successfully",
        product,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },

  deleteProduct: async (req: AuthenticatedRequest, res: Response) => {
    try {
      await ProductsService.deleteProduct(
        req.params.id as string,
        req.user!.shopId,
      );

      return res.status(200).json({
        message: "Product deleted successfully",
      });
    } catch (error) {
      return handleError(res, error);
    }
  },

  adjustStock: async (req: AuthenticatedRequest, res: Response) => {
    try {
      const body = AdjustStockSchema.parse(req.body);

      const product = await ProductsService.adjustStock(
        req.params.id as string,
        req.user!.shopId,
        req.user!.userId,
        body,
      );

      return res.status(200).json({
        message: "Stock adjusted successfully",
        product,
      });
    } catch (error) {
      if (error instanceof ZodError) return handleZodError(res, error);
      return handleError(res, error);
    }
  },
};
