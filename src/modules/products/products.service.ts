import { ProductsRepository } from "./products.repository";
import {
  CreateProductInput,
  UpdateProductInput,
  AdjustStockInput,
  CreateCategoryInput,
} from "./products.schema";
import redis from "@lib/redis";

// CACHE KEYS

const CacheKeys = {
  productList: (shopId: string) => `products:${shopId}:list`,
  product: (shopId: string, productId: string) =>
    `product:${shopId}:${productId}`,
  categoryList: (shopId: string) => `categories:${shopId}:list`,
  lowStock: (shopId: string) => `products:${shopId}:low-stock`,
};

const CACHE_TTL = {
  productList: 15 * 60, // 15 minutes
  product: 5 * 60, // 5 minutes
  categoryList: 60 * 60, // 1 hour
  lowStock: 5 * 60, // 5 minutes
};

// CACHE HELPERS
const invalidateProductCaches = async (shopId: string, productId?: string) => {
  const keys = [CacheKeys.productList(shopId), CacheKeys.lowStock(shopId)];

  if (productId) {
    keys.push(CacheKeys.product(shopId, productId));
  }

  await redis.del(...keys);
};

// PRODUCT SERVICE

export const ProductsService = {
  // categories

  createCategory: async (shopId: string, data: CreateCategoryInput) => {
    // check duplicate category name
    const existing = await ProductsRepository.findCategoryByName(
      data.name,
      shopId,
    );

    if (existing) {
      throw new Error("DUPLICATE_CATEGORY");
    }

    const category = await ProductsRepository.createCategory(shopId, data);

    // invalidate category cache
    await redis.del(CacheKeys.categoryList(shopId));

    return category;
  },

  getCategories: async (shopId: string) => {
    // check cache first
    const cached = await redis.get(CacheKeys.categoryList(shopId));
    if (cached) return JSON.parse(cached);

    // cache miss, fetch from DB
    const categories = await ProductsRepository.findAllCategories(shopId);

    // store in cache
    await redis.setex(
      CacheKeys.categoryList(shopId),
      CACHE_TTL.categoryList,
      JSON.stringify(categories),
    );

    return categories;
  },

  deleteCategory: async (id: string, shopId: string) => {
    // check category exists
    const category = await ProductsRepository.findCategoryById(id, shopId);
    if (!category) throw new Error("CATEGORY_NOT_FOUND");

    await ProductsRepository.deleteCategory(id, shopId);

    // invalidate cache
    await redis.del(CacheKeys.categoryList(shopId));
  },

  // PRODUCTS

  createProduct: async (shopId: string, data: CreateProductInput) => {
    // check sku uniqueness if provided
    if (data.sku) {
      const existing = await ProductsRepository.findProductBySku(
        data.sku,
        shopId,
      );
      if (existing) throw new Error("DUPLICATE_SKU");
    }

    // check barcode uniqueness if provided
    if (data.barcode) {
      const existing = await ProductsRepository.findProductByBarcode(
        data.barcode,
        shopId,
      );
      if (existing) throw new Error("DUPLICATE_BARCODE");
    }

    // check category belongs to shop if provided
    if (data.categoryId) {
      const category = await ProductsRepository.findCategoryById(
        data.categoryId,
        shopId,
      );
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
    }

    // create product
    const product = await ProductsRepository.createProduct(shopId, data);

    // invalidate product list cache
    await invalidateProductCaches(shopId);

    return product;
  },

  getProducts: async (shopId: string, page: number, limit: number) => {
    // only cache first page
    if (page === 1) {
      const cached = await redis.get(CacheKeys.productList(shopId));
      if (cached) return JSON.parse(cached);
    }

    const result = await ProductsRepository.findAllProducts(
      shopId,
      page,
      limit,
    );

    // cache first page only
    if (page === 1) {
      await redis.setex(
        CacheKeys.productList(shopId),
        CACHE_TTL.productList,
        JSON.stringify(result),
      );
    }

    return result;
  },

  // get single product
  getProduct: async (id: string, shopId: string) => {
    // Check cache first
    const cached = await redis.get(CacheKeys.product(shopId, id));
    if (cached) return JSON.parse(cached);

    // Cache miss
    const product = await ProductsRepository.findProductById(id, shopId);
    if (!product) throw new Error("PRODUCT_NOT_FOUND");

    // Store in cache
    await redis.setex(
      CacheKeys.product(shopId, id),
      CACHE_TTL.product,
      JSON.stringify(product),
    );

    return product;
  },

  searchProducts: async (
    shopId: string,
    query: string,
    page: number,
    limit: number,
  ) => {
    return ProductsRepository.searchByName(shopId, query, page, limit);
  },

  searchByBarcode: async (barcode: string, shopId: string) => {
    const product = await ProductsRepository.findProductByBarcode(
      barcode,
      shopId,
    );

    if (!product) throw new Error("PRODUCT_NOT_FOUND");

    return product;
  },

  getLowStockProducts: async (shopId: string) => {
    // Check cache first
    const cached = await redis.get(CacheKeys.lowStock(shopId));
    if (cached) return JSON.parse(cached);

    // Cache miss
    const products = await ProductsRepository.findLowStockProducts(shopId);

    // Cache for 5 minutes
    await redis.setex(
      CacheKeys.lowStock(shopId),
      CACHE_TTL.lowStock,
      JSON.stringify(products),
    );

    return products;
  },

  updateProduct: async (
    id: string,
    shopId: string,
    data: UpdateProductInput,
  ) => {
    // Check product exists
    const product = await ProductsRepository.findProductById(id, shopId);
    if (!product) throw new Error("PRODUCT_NOT_FOUND");

    // Check SKU uniqueness if changing SKU
    if (data.sku && data.sku !== product.sku) {
      const existing = await ProductsRepository.findProductBySku(
        data.sku,
        shopId,
      );
      if (existing) throw new Error("DUPLICATE_SKU");
    }

    // Check barcode uniqueness if changing barcode
    if (data.barcode && data.barcode !== product.barcode) {
      const existing = await ProductsRepository.findProductByBarcode(
        data.barcode,
        shopId,
      );
      if (existing) throw new Error("DUPLICATE_BARCODE");
    }

    // Check category belongs to shop if changing category
    if (data.categoryId && data.categoryId !== product.categoryId) {
      const category = await ProductsRepository.findCategoryById(
        data.categoryId,
        shopId,
      );
      if (!category) throw new Error("CATEGORY_NOT_FOUND");
    }

    // Update product
    const updated = await ProductsRepository.updateProduct(id, shopId, data);

    // Invalidate caches
    await invalidateProductCaches(shopId, id);

    return updated;
  },

  deleteProduct: async (id: string, shopId: string) => {
    // Check product exists
    const product = await ProductsRepository.findProductById(id, shopId);
    if (!product) throw new Error("PRODUCT_NOT_FOUND");

    // Soft delete
    await ProductsRepository.softDeleteProduct(id, shopId);

    // Invalidate caches
    await invalidateProductCaches(shopId, id);
  },

  adjustStock: async (
    id: string,
    shopId: string,
    performedById: string,
    data: AdjustStockInput,
  ) => {
    // Determine actual quantity change based on movement type
    // DAMAGE and negative ADJUSTMENT reduce stock
    let quantity = data.quantity;

    if (data.movementType === "DAMAGE") {
      // Damage always reduces stock
      quantity = -Math.abs(data.quantity);
    }

    // RESTOCK always increases stock
    if (data.movementType === "RESTOCK") {
      quantity = Math.abs(data.quantity);
    }

    // ADJUSTMENT can be positive or negative
    // Use the quantity as provided by the user

    const updated = await ProductsRepository.adjustStock(
      id,
      shopId,
      quantity,
      performedById,
      data,
    );

    // Invalidate caches
    await invalidateProductCaches(shopId, id);

    return updated;
  },
};
