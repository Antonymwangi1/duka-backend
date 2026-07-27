import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "@middleware/errorHandler";
import authRouter from "@modules/auth/auth.routes";
import productsRouter from "@modules/products/products.routes";

const app = express();
// global middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    credentials: true, // required for cookies
  }),
);
app.use(express.json());
app.use(cookieParser());

// health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Routes
app.use("/api/v1/auth/", authRouter);
app.use("/api/v1/products", productsRouter);

// Error handler
app.use(errorHandler);

export default app;
