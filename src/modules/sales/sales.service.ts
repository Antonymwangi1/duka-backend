import { SalesRepository } from "./sales.repository";
import { ProductsRepository } from "@modules/products/products.repository";
import {
  CreateSaleInput,
  ListSalesQuery,
  ReverseSaleInput,
} from "./sales.schema";
import { PaymentMethod } from "@prisma/client";
import redis from "@lib/redis";

// CACHE KEYS

const CacheKeys = {
  sale: (shopId: string, saleId: string) => `sale:${shopId}:${saleId}`,
  salesList: (shopId: string) => `sales:${shopId}:list`,
};

const invalidateSalesCaches = async (shopId: string, saleId?: string) => {
  const keys = [CacheKeys.salesList(shopId)];
  if (saleId) keys.push(CacheKeys.sale(shopId, saleId));
  await redis.del(...keys);
};

// HELPER: Invalidate all dynamic report caches for a shop
const invalidateReportCaches = async (shopId: string) => {
  const keys = await redis.keys(`reports:${shopId}:*`);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
};

// SALES SERVICE

export const SalesService = {
  // create sale

  createSale: async (
    shopId: string,
    staffId: string,
    data: CreateSaleInput,
  ) => {
    // fetch all products in the sale
    const productIds = data.items.map((items) => items.productId);

    const products = await Promise.all(
      productIds.map((id) => ProductsRepository.findProductById(id, shopId)),
    );

    // verify all products exist and belong to this shop
    for (let i = 0; i < products.length; i++) {
      if (!products[i]) {
        throw new Error(`PRODUCT_NOT_FOUND:${productIds[i]}`);
      }
    }

    // calculate sale totals
    let subtotal = 0;
    const saleItems = data.items.map((item, index) => {
      const product = products[index]!;
      const unitPrice = Number(product.sellingPrice);
      const buyingPrice = Number(product.buyingPrice);
      const itemSubtotal = unitPrice * item.quantity;

      subtotal += itemSubtotal;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        buyingPrice,
        subtotal: itemSubtotal,
      };
    });

    // calculate discount and total
    const discountAmount = (subtotal * data.discount) / 100;
    const totalAmount = subtotal - discountAmount;

    // create the sale
    const sale = await SalesRepository.createSale({
      shopId,
      servedById: staffId,
      paymentMethod: data.paymentMethod as PaymentMethod,
      subtotal,
      discount: discountAmount,
      totalAmount,
      notes: data.notes,
      items: saleItems,
    });

    // Invalidate sale list caches
    await invalidateSalesCaches(shopId);

    // Invalidate product caches since stock changed
    const productKeys = [
      `products:${shopId}:list`,
      `products:${shopId}:low-stock`,
      ...saleItems.map((item) => `product:${shopId}:${item.productId}`),
    ];
    await redis.del(...productKeys);

    // Invalidate all report caches (daily, weekly, monthly, staff, top products)
    await invalidateReportCaches(shopId);

    return sale;
  },

  // get sale by id
  getSale: async (id: string, shopId: string) => {
    // Check cache first
    const cached = await redis.get(CacheKeys.sale(shopId, id));
    if (cached) return JSON.parse(cached);

    // Cache miss
    const sale = await SalesRepository.findSaleById(id, shopId);
    if (!sale) throw new Error("SALE_NOT_FOUND");

    // Cache for 1 hour sales never change after creation
    await redis.setex(
      CacheKeys.sale(shopId, id),
      60 * 60,
      JSON.stringify(sale),
    );

    return sale;
  },

  // get receipt
  getReceipt: async (id: string, shopId: string) => {
    const sale = await SalesService.getSale(id, shopId);

    // Format receipt data
    return {
      receiptNumber: sale.id.slice(0, 8).toUpperCase(),
      shopName: sale.shop.shopName,
      shopAddress: sale.shop.address,
      shopPhone: sale.shop.phone,
      currency: sale.shop.currency,
      date: sale.createdAt,
      cashier: sale.servedBy.fullname,
      items: sale.saleItems.map((item: any) => ({
        name: item.product.name,
        unit: item.product.unit,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
      })),
      subtotal: Number(sale.subtotal),
      discount: Number(sale.discount),
      totalAmount: Number(sale.totalAmount),
      paymentMethod: sale.paymentMethod,
    };
  },

  // list sales
  listSales: async (shopId: string, query: ListSalesQuery) => {
    // Only cache unfiltered first page
    const isUnfiltered =
      !query.staffId && !query.date && !query.startDate && !query.endDate;

    if (isUnfiltered && query.page === 1) {
      const cached = await redis.get(CacheKeys.salesList(shopId));
      if (cached) return JSON.parse(cached);
    }

    const result = await SalesRepository.listSales({
      shopId,
      staffId: query.staffId,
      date: query.date,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });

    // Cache unfiltered first page only
    if (isUnfiltered && query.page === 1) {
      await redis.setex(
        CacheKeys.salesList(shopId),
        20 * 60, // 20 minutes
        JSON.stringify(result),
      );
    }

    return result;
  },

  // reverse sale
  reverseSale: async (
    saleId: string,
    shopId: string,
    performedById: string,
    data: ReverseSaleInput,
  ) => {
    // Check sale exists
    const sale = await SalesRepository.findSaleById(saleId, shopId);
    if (!sale) throw new Error("SALE_NOT_FOUND");

    // Validate specific items if provided
    if (data.items) {
      for (const reverseItem of data.items) {
        const saleItem = sale.saleItems.find(
          (item: any) => item.id === reverseItem.saleItemId,
        );

        if (!saleItem) {
          throw new Error("SALE_ITEM_NOT_FOUND");
        }

        if (reverseItem.quantity > saleItem.quantity) {
          throw new Error("REVERSE_QUANTITY_EXCEEDED");
        }
      }
    }

    // Perform reversal
    const result = await SalesRepository.reverseSale(
      saleId,
      shopId,
      performedById,
      data.reason,
      data.items,
    );

    // Invalidate caches
    await invalidateSalesCaches(shopId, saleId);

    // Invalidate product caches since stock changed
    const productKeys = [
      `products:${shopId}:list`,
      `products:${shopId}:low-stock`,
      ...sale.saleItems.map(
        (item) => `product:${shopId}:${(item as any).productId}`,
      ),
    ];
    await redis.del(...productKeys);

    // Invalidate report caches so dashboard updates on reversals
    await invalidateReportCaches(shopId);

    return result;
  },
};
