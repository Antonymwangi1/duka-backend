import { prisma } from "@lib/prisma";
import {
  CreateProductInput,
  UpdateProductInput,
  AdjustStockInput,
  CreateCategoryInput,
} from "./products.schema";

// PRODUCTS REPOSITORY

export const ProductsRepository = {
  // CATEGORY QUERIES

  createCategory: async (shopId: string, data: CreateCategoryInput) => {
    return prisma.category.create({
      data: {
        name: data.name,
        shopId,
      },
    });
  },

  findCategoryById: async (id: string, shopId: string) => {
    return prisma.category.findFirst({
      where: { id, shopId },
    });
  },

  findCategoryByName: async (name: string, shopId: string) => {
    return prisma.category.findFirst({
      where: {
        name: { equals: name, mode: "insensitive" },
        shopId,
      },
    });
  },

  findAllCategories: async (shopId: string) => {
    return prisma.category.findMany({
      where: { shopId },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: { products: true },
        },
      },
    });
  },

  deleteCategory: async (id: string, shopId: string) => {
    return prisma.category.delete({
      where: { id },
    });
  },

  // PRODUCT QUERIES

  createProduct: async (shopId: string, data: CreateProductInput) => {
    return prisma.product.create({
      data: {
        shopId,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        sku: data.sku,
        barcode: data.barcode,
        unit: data.unit,
        buyingPrice: data.buyingPrice,
        sellingPrice: data.sellingPrice,
        stockQuantity: data.stockQuantity,
        lowStockThreshold: data.lowStockThreshold,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  },

  findProductById: async (id: string, shopId: string) => {
    return prisma.product.findFirst({
      where: { id, shopId, isActive: true },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  },

  findProductBySku: async (sku: string, shopId: string) => {
    return prisma.product.findFirst({
      where: { sku, shopId, isActive: true },
    });
  },

  findProductByBarcode: async (barcode: string, shopId: string) => {
    return prisma.product.findFirst({
      where: { barcode, shopId, isActive: true },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  },

  findAllProducts: async (shopId: string, page: number, limit: number) => {
    const skip = (page - 1) * limit;

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: { shopId, isActive: true },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.product.count({
        where: { shopId, isActive: true },
      }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  },

  searchByName: async (
    shopId: string,
    query: string,
    page: number,
    limit: number,
  ) => {
    const skip = (page - 1) * limit;

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where: {
          shopId,
          isActive: true,
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { name: "asc" },
        skip,
        take: limit,
      }),
      prisma.product.count({
        where: {
          shopId,
          isActive: true,
          name: {
            contains: query,
            mode: "insensitive",
          },
        },
      }),
    ]);

    return {
      products,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  },

  findLowStockProducts: async (shopId: string) => {
    // Fetch shop default threshold
    const shop = await prisma.shop.findUnique({
      where: { id: shopId },
      select: { defaultLowStockThreshold: true },
    });

    const defaultThreshold = shop?.defaultLowStockThreshold ?? 5;

    return prisma.product.findMany({
      where: {
        shopId,
        isActive: true,
        OR: [
          // Product has its own threshold set
          {
            lowStockThreshold: { not: null },
            stockQuantity: {
              lte: prisma.product.fields.lowStockThreshold,
            },
          },
          // Product uses shop default threshold
          {
            lowStockThreshold: null,
            stockQuantity: { lte: defaultThreshold },
          },
        ],
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
      orderBy: { stockQuantity: "asc" },
    });
  },

  updateProduct: async (
    id: string,
    shopId: string,
    data: UpdateProductInput,
  ) => {
    return prisma.product.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.buyingPrice !== undefined && {
          buyingPrice: data.buyingPrice,
        }),
        ...(data.sellingPrice !== undefined && {
          sellingPrice: data.sellingPrice,
        }),
        ...(data.lowStockThreshold !== undefined && {
          lowStockThreshold: data.lowStockThreshold,
        }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });
  },

  softDeleteProduct: async (id: string, shopId: string) => {
    return prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
  },

  // STOCK ADJUSTMENT

  adjustStock: async (
    id: string,
    shopId: string,
    quantity: number,
    performedById: string,
    data: AdjustStockInput,
  ) => {
    return prisma.$transaction(async (tx) => {
      // Fetch current product with lock
      const product = await tx.product.findFirst({
        where: { id, shopId, isActive: true },
      });

      if (!product) throw new Error("PRODUCT_NOT_FOUND");

      // Calculate new quantity
      const newQuantity = Number(product.stockQuantity) + quantity;

      if (newQuantity < 0) {
        throw new Error("INSUFFICIENT_STOCK");
      }

      // Update product stock
      const updated = await tx.product.update({
        where: { id },
        data: { stockQuantity: newQuantity },
      });

      // Create stock movement record
      await tx.stockMovement.create({
        data: {
          shopId,
          productId: id,
          performedById,
          movementType: data.movementType,
          quantity,
          notes: data.notes,
        },
      });

      return updated;
    });
  },
};
