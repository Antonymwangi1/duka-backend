import { prisma } from "@lib/prisma";

// DATE RANGE HELPER

export const getDateRange = (period: string, date?: string, month?: string) => {
  const now = new Date();

  if (period === "daily") {
    const target = date ? new Date(date) : now;
    const start = new Date(target);
    const end = new Date(target);

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (period === "weekly") {
    const target = date ? new Date(date) : now;
    const dayOfWeek = target.getDay();
    const start = new Date(target);
    const end = new Date(target);

    // Start of week (Monday)
    start.setDate(target.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    start.setHours(0, 0, 0, 0);

    // End of week (Sunday)
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  if (period === "monthly") {
    if (month) {
      const [year, monthNum] = month.split("-").map(Number);
      const start = new Date(year, monthNum - 1, 1);
      const end = new Date(year, monthNum, 0, 23, 59, 59, 999);
      return { start, end };
    }

    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );
    return { start, end };
  }

  // Default to today
  const start = new Date(now);
  const end = new Date(now);
  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// REPORTS REPOSITORY

console.log("CALCULATING FRESH SUMMARY");

export const ReportsRepository = {
  // SALES SUMMARY

  getSalesSummary: async (shopId: string, start: Date, end: Date) => {
    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        saleItems: true,
      },
    });

    const totalSales = sales.length;
    const totalRevenue = sales.reduce(
      (sum, sale) => sum + Number(sale.totalAmount),
      0,
    );
    const totalDiscount = sales.reduce(
      (sum, sale) => sum + Number(sale.discount),
      0,
    );
    const totalItems = sales.reduce(
      (sum, sale) =>
        sum + sale.saleItems.reduce((s, item) => s + item.quantity, 0),
      0,
    );

    const cashSales = sales.filter((s) => s.paymentMethod === "CASH");
    const mpesaSales = sales.filter((s) => s.paymentMethod === "MPESA");

    return {
      totalSales,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalItems,
      paymentMethods: {
        cash: {
          count: cashSales.length,
          revenue: Number(
            cashSales
              .reduce((sum, s) => sum + Number(s.totalAmount), 0)
              .toFixed(2),
          ),
        },
        mpesa: {
          count: mpesaSales.length,
          revenue: Number(
            mpesaSales
              .reduce((sum, s) => sum + Number(s.totalAmount), 0)
              .toFixed(2),
          ),
        },
      },
      averageTransactionValue:
        totalSales > 0 ? Number((totalRevenue / totalSales).toFixed(2)) : 0,
    };
  },

  // PROFIT REPORT

  getProfitReport: async (shopId: string, start: Date, end: Date) => {
    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        createdAt: { gte: start, lte: end },
      },
      include: { saleItems: true },
    });

    let totalRevenue = 0;
    let totalCost = 0;
    let totalDiscount = 0;

    for (const sale of sales) {
      totalRevenue += Number(sale.totalAmount);
      totalDiscount += Number(sale.discount);

      for (const item of sale.saleItems) {
        totalCost += Number(item.buyingPrice) * item.quantity;
      }
    }

    const grossProfit = totalRevenue - totalCost;
    const profitMargin =
      totalRevenue > 0
        ? Number(((grossProfit / totalRevenue) * 100).toFixed(2))
        : 0;

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      totalCost: Number(totalCost.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      grossProfit: Number(grossProfit.toFixed(2)),
      profitMargin,
      totalSales: sales.length,
    };
  },

  // TOP PRODUCTS

  getTopProducts: async (
    shopId: string,
    start: Date,
    end: Date,
    limit: number,
  ) => {
    const saleItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          shopId,
          createdAt: { gte: start, lte: end },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            unit: true,
            sellingPrice: true,
          },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<
      string,
      {
        productId: string;
        name: string;
        unit: string | null;
        unitsSold: number;
        revenue: number;
        profit: number;
      }
    >();

    for (const item of saleItems) {
      const existing = productMap.get(item.productId);
      const profit =
        (Number(item.unitPrice) - Number(item.buyingPrice)) * item.quantity;

      if (existing) {
        existing.unitsSold += item.quantity;
        existing.revenue += Number(item.subtotal);
        existing.profit += profit;
      } else {
        productMap.set(item.productId, {
          productId: item.productId,
          name: item.product.name,
          unit: item.product.unit,
          unitsSold: item.quantity,
          revenue: Number(item.subtotal),
          profit,
        });
      }
    }

    // Sort by units sold and take top N
    return Array.from(productMap.values())
      .sort((a, b) => b.unitsSold - a.unitsSold)
      .slice(0, limit)
      .map((p) => ({
        ...p,
        revenue: Number(p.revenue.toFixed(2)),
        profit: Number(p.profit.toFixed(2)),
      }));
  },

  // STAFF PERFORMANCE

  getStaffPerformance: async (shopId: string, start: Date, end: Date) => {
    const sales = await prisma.sale.findMany({
      where: {
        shopId,
        createdAt: { gte: start, lte: end },
      },
      include: {
        servedBy: {
          select: {
            id: true,
            fullname: true,
            role: true,
          },
        },
        saleItems: true,
      },
    });

    // Aggregate by staff member
    const staffMap = new Map<
      string,
      {
        staffId: string;
        name: string;
        role: string;
        salesCount: number;
        totalRevenue: number;
        totalItems: number;
      }
    >();

    for (const sale of sales) {
      const existing = staffMap.get(sale.servedById);
      const items = sale.saleItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      if (existing) {
        existing.salesCount += 1;
        existing.totalRevenue += Number(sale.totalAmount);
        existing.totalItems += items;
      } else {
        staffMap.set(sale.servedById, {
          staffId: sale.servedById,
          name: sale.servedBy.fullname,
          role: sale.servedBy.role,
          salesCount: 1,
          totalRevenue: Number(sale.totalAmount),
          totalItems: items,
        });
      }
    }

    // Sort by total revenue
    return Array.from(staffMap.values())
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((s) => ({
        ...s,
        totalRevenue: Number(s.totalRevenue.toFixed(2)),
        averageTransactionValue:
          s.salesCount > 0
            ? Number((s.totalRevenue / s.salesCount).toFixed(2))
            : 0,
      }));
  },

  // CACHED REPORT HELPERS

  findCachedReport: async (
    shopId: string,
    reportType: string,
    periodStart: Date,
    periodEnd: Date,
  ) => {
    return prisma.report.findFirst({
      where: {
        shopId,
        reportType,
        periodStart,
        periodEnd,
      },
    });
  },

  saveReport: async (
    shopId: string,
    generatedById: string,
    reportType: string,
    periodStart: Date,
    periodEnd: Date,
    data: object,
  ) => {
    return prisma.report.upsert({
      where: {
        shopId_reportType_periodStart_periodEnd: {
          shopId,
          reportType,
          periodStart,
          periodEnd,
        },
      },
      update: { reportData: data },
      create: {
        shopId,
        generatedById,
        reportType,
        periodStart,
        periodEnd,
        reportData: data,
      },
    });
  },
};
