import { Request, Response, NextFunction } from "express";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  console.error(err.stack);

  return res.status(500).json({
    message: "something went wrong",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
};
