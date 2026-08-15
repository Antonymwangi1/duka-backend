import { ReportsRepository, getDateRange } from "./reports.repository";
import {
  ReportQuery,
  TopProductsQuery,
  StaffReportQuery,
} from "./reports.schema";
import redis from "@lib/redis";

// CACHE KEYS

const CacheKeys = {
  summary: (shopId: string, period: string, date: string) =>
    `reports:${shopId}:summary:${period}:${date}`,
  profit: (shopId: string, period: string, date: string) =>
    `reports:${shopId}:profit:${period}:${date}`,
  topProducts: (shopId: string, period: string, date: string, limit: number) =>
    `reports:${shopId}:top-products:${period}:${date}:${limit}`,
  staff: (shopId: string, period: string, date: string) =>
    `reports:${shopId}:staff:${period}:${date}`,
  lowStock: (shopId: string) => `products:${shopId}:low-stock`,
};

// ============================================================
// CACHE TTL
// ============================================================

const getCacheTTL = (start: Date, end: Date) => {
  const now = new Date();

  // Past periods — cache permanently (24 hours is enough)
  if (end < now) return 24 * 60 * 60;

  // Current period — cache for 5 minutes
  // so owner gets reasonably fresh data
  return 5 * 60;
};

// DATE KEY HELPER

const buildDateKey = (period: string, date?: string, month?: string) => {
  if (period === "monthly")
    return month ?? new Date().toISOString().slice(0, 7);
  return date ?? new Date().toISOString().slice(0, 10);
};

// REPORTS SERVICE

export const ReportsService = {
  // SALES SUMMARY

  getSummary: async (
    shopId: string,
    generatedById: string,
    query: ReportQuery,
  ) => {
    console.log("=== SUMMARY REQUEST ===");
    console.log("shopId:", shopId);
    console.log("query:", query);

    const { start, end } = getDateRange(query.period, query.date, query.month);

    const dateKey = buildDateKey(query.period, query.date, query.month);
    const cacheKey = CacheKeys.summary(shopId, query.period, dateKey);

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    console.log("cacheKey:", cacheKey);
    console.log("redis cached:", cached);
    if (cached) return JSON.parse(cached);

    // Check reports table for past periods
    const savedReport = await ReportsRepository.findCachedReport(
      shopId,
      "summary",
      start,
      end,
    );

    if (savedReport) {
      // Store in Redis for faster subsequent access
      await redis.setex(
        cacheKey,
        24 * 60 * 60,
        JSON.stringify(savedReport.reportData),
      );
      return savedReport.reportData;
    }

    // Calculate fresh report
    const data = await ReportsRepository.getSalesSummary(shopId, start, end);

    // Save to reports table
    await ReportsRepository.saveReport(
      shopId,
      generatedById,
      "summary",
      start,
      end,
      data,
    );

    // Cache in Redis
    const ttl = getCacheTTL(start, end);
    await redis.setex(cacheKey, ttl, JSON.stringify(data));

    return data;
  },

  // ----------------------------------------------------------
  // PROFIT REPORT
  // ----------------------------------------------------------

  getProfitReport: async (
    shopId: string,
    generatedById: string,
    query: ReportQuery,
  ) => {
    const { start, end } = getDateRange(query.period, query.date, query.month);

    const dateKey = buildDateKey(query.period, query.date, query.month);
    const cacheKey = CacheKeys.profit(shopId, query.period, dateKey);

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Check reports table
    const savedReport = await ReportsRepository.findCachedReport(
      shopId,
      "profit",
      start,
      end,
    );

    if (savedReport) {
      await redis.setex(
        cacheKey,
        24 * 60 * 60,
        JSON.stringify(savedReport.reportData),
      );
      return savedReport.reportData;
    }

    // Calculate fresh report
    const data = await ReportsRepository.getProfitReport(shopId, start, end);

    // Save and cache
    await ReportsRepository.saveReport(
      shopId,
      generatedById,
      "profit",
      start,
      end,
      data,
    );

    const ttl = getCacheTTL(start, end);
    await redis.setex(cacheKey, ttl, JSON.stringify(data));

    return data;
  },

  // ----------------------------------------------------------
  // TOP PRODUCTS
  // ----------------------------------------------------------

  getTopProducts: async (
    shopId: string,
    generatedById: string,
    query: TopProductsQuery,
  ) => {
    const { start, end } = getDateRange(query.period, query.date);

    const dateKey = buildDateKey(query.period, query.date);
    const cacheKey = CacheKeys.topProducts(
      shopId,
      query.period,
      dateKey,
      query.limit,
    );

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Check reports table
    const reportType = `top_products_${query.limit}`;
    const savedReport = await ReportsRepository.findCachedReport(
      shopId,
      reportType,
      start,
      end,
    );

    if (savedReport) {
      await redis.setex(
        cacheKey,
        24 * 60 * 60,
        JSON.stringify(savedReport.reportData),
      );
      return savedReport.reportData;
    }

    // Calculate fresh report
    const data = await ReportsRepository.getTopProducts(
      shopId,
      start,
      end,
      query.limit,
    );

    // Save and cache
    await ReportsRepository.saveReport(
      shopId,
      generatedById,
      reportType,
      start,
      end,
      data,
    );

    const ttl = getCacheTTL(start, end);
    await redis.setex(cacheKey, ttl, JSON.stringify(data));

    return data;
  },

  // ----------------------------------------------------------
  // STAFF PERFORMANCE
  // ----------------------------------------------------------

  getStaffPerformance: async (
    shopId: string,
    generatedById: string,
    query: StaffReportQuery,
  ) => {
    const { start, end } = getDateRange(query.period, query.date, query.month);

    const dateKey = buildDateKey(query.period, query.date, query.month);
    const cacheKey = CacheKeys.staff(shopId, query.period, dateKey);

    // Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Check reports table
    const savedReport = await ReportsRepository.findCachedReport(
      shopId,
      "staff_performance",
      start,
      end,
    );

    if (savedReport) {
      await redis.setex(
        cacheKey,
        24 * 60 * 60,
        JSON.stringify(savedReport.reportData),
      );
      return savedReport.reportData;
    }

    // Calculate fresh report
    const data = await ReportsRepository.getStaffPerformance(
      shopId,
      start,
      end,
    );

    // Save and cache
    await ReportsRepository.saveReport(
      shopId,
      generatedById,
      "staff_performance",
      start,
      end,
      data,
    );

    const ttl = getCacheTTL(start, end);
    await redis.setex(cacheKey, ttl, JSON.stringify(data));

    return data;
  },

  // ----------------------------------------------------------
  // LOW STOCK REPORT
  // ----------------------------------------------------------

  getLowStockReport: async (shopId: string) => {
    // Low stock is already cached in products module
    // Reuse that cache key
    const cacheKey = CacheKeys.lowStock(shopId);

    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Import products repository to reuse the query
    const { ProductsRepository } =
      await import("@modules/products/products.repository");

    const products = await ProductsRepository.findLowStockProducts(shopId);

    await redis.setex(cacheKey, 5 * 60, JSON.stringify(products));

    return products;
  },
};
