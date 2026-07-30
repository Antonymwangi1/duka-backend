import { prisma } from "@lib/prisma";
import { PaymentMethod } from "@prisma/client";

// TYPES

interface CreateSaleData {
  shopId: string;
  servedById: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discount: number;
  totalAmount: number;
  notes?: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    buyingPrice: number;
    subtotal: number;
  }[];
}

interface ListSalesFilters {
  shopId: string;
  staffId?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

// SALES REPOSITORY

export const SalesRepository = {
  // CREATE SALE

  createSale: async (data: CreateSaleData) => {
    return prisma.$transaction(async (tx) => {
      // Lock and verify stock for all items
      for (const item of data.items) {
        const product = await tx.product.findFirst({
          where: {
            id: item.productId,
            shopId: data.shopId,
            isActive: true,
          },
        });

        if (!product) {
          throw new Error(`PRODUCT_NOT_FOUND:${item.productId}`);
        }

        if (Number(product.stockQuantity) < item.quantity) {
          throw new Error(`INSUFFICIENT_STOCK:${product.name}`);
        }
      }

      // Create sale header
      const sale = await tx.sale.create({
        data: {
          shopId: data.shopId,
          servedById: data.servedById,
          paymentMethod: data.paymentMethod,
          subtotal: data.subtotal,
          discount: data.discount,
          totalAmount: data.totalAmount,
          notes: data.notes,
          saleItems: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              buyingPrice: item.buyingPrice,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          servedBy: {
            select: {
              id: true,
              fullname: true,
            },
          },
        },
      });

      // Deduct stock and create stock movements
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        await tx.stockMovement.create({
          data: {
            shopId: data.shopId,
            productId: item.productId,
            performedById: data.servedById,
            movementType: "SALE",
            quantity: -item.quantity,
            notes: `Sale #${sale.id}`,
          },
        });
      }

      return sale;
    });
  },

  // FIND SALE BY ID

  findSaleById: async (id: string, shopId: string) => {
    return prisma.sale.findFirst({
      where: { id, shopId },
      include: {
        saleItems: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                unit: true,
              },
            },
          },
        },
        servedBy: {
          select: {
            id: true,
            fullname: true,
          },
        },
        shop: {
          select: {
            id: true,
            shopName: true,
            address: true,
            phone: true,
            currency: true,
          },
        },
      },
    });
  },

  // LIST SALES

  listSales: async (filters: ListSalesFilters) => {
    const { shopId, staffId, date, startDate, endDate, page, limit } = filters;

    const skip = (page - 1) * limit;

    // Build date filter
    let dateFilter = {};

    if (date) {
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);
      const end = new Date(`${endDate}T23:59:59.999Z`);
      dateFilter = { createdAt: { gte: start, lte: end } };
    }

    const where = {
      shopId,
      ...(staffId && { servedById: staffId }),
      ...dateFilter,
    };

    const [sales, total] = await prisma.$transaction([
      prisma.sale.findMany({
        where,
        include: {
          saleItems: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  unit: true,
                },
              },
            },
          },
          servedBy: {
            select: {
              id: true,
              fullname: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    return {
      sales,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  },

  // REVERSE SALE

  reverseSale: async (
    saleId: string,
    shopId: string,
    performedById: string,
    reason: string,
    itemsToReverse?: { saleItemId: string; quantity: number }[],
  ) => {
    return prisma.$transaction(async (tx) => {
      // Fetch the original sale
      const sale = await tx.sale.findFirst({
        where: { id: saleId, shopId },
        include: { saleItems: true },
      });

      if (!sale) throw new Error("SALE_NOT_FOUND");

      // Determine which items to reverse
      const itemsForReversal = itemsToReverse
        ? sale.saleItems.filter((item) =>
            itemsToReverse.some((r) => r.saleItemId === item.id),
          )
        : sale.saleItems;

      // Restore stock for each item
      for (const item of itemsForReversal) {
        const reverseQty = itemsToReverse
          ? (itemsToReverse.find((r) => r.saleItemId === item.id)?.quantity ??
            item.quantity)
          : item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stockQuantity: { increment: reverseQty } },
        });

        await tx.stockMovement.create({
          data: {
            shopId,
            productId: item.productId,
            performedById,
            movementType: "ADJUSTMENT",
            quantity: reverseQty,
            notes: `Reversal of Sale #${saleId} — ${reason}`,
          },
        });
      }

      // Return reversal summary
      return {
        saleId,
        reversedItems: itemsForReversal.length,
        reason,
      };
    });
  },
};
