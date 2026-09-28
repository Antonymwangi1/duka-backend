import { AuthenticatedRequest } from "@custom-types/index";

export const getShopId = (req: AuthenticatedRequest): string => {
  const shopId = req.user?.shopId;

  if (!shopId) {
    throw new Error("SHOP_SELECTION_REQUIRED");
  }

  return shopId;
};