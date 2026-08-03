import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { errorHandler } from "@middleware/errorHandler";
import authRouter from "@modules/auth/auth.routes";
import productsRouter from "@modules/products/products.routes";
import salesRouter from "@modules/sales/sales.routes";
import reportsRouter from "@modules/reports/reports.routes";

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
app.use("/api/v1/sales", salesRouter);
app.use("/api/v1/reports", reportsRouter);

// Error handler
app.use(errorHandler);

export default app;
