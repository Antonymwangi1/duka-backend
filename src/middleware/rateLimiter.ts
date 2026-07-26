import rateLimit from "express-rate-limit";

interface RateLimiterOptions {
  max: number;
  windowMs: number;
  message?: string;
}

export const rateLimiter = (options: RateLimiterOptions) => {
  return rateLimit({
    max: options.max,
    windowMs: options.windowMs,
    message: {
      message: options.message ?? "Too many requests. Please try again later.",
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};
