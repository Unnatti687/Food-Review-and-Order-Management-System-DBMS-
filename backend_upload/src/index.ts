import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { v2 as cloudinary } from "cloudinary";

// Routes
import myUserRoute from "./routes/MyUserRoute";
import authRoute from "./routes/auth";
import myRestaurantRoute from "./routes/MyRestaurantRoute";
import restaurantRoute from "./routes/RestaurantRoute";
import orderRoute from "./routes/OrderRoute";
import analyticsRoute from "./routes/AnalyticsRoute";

// ✅ FIXED: Correct env variable name
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is missing in .env");
  process.exit(1);
}

// ✅ Connect DB safely
mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to database!"))
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });

// ✅ Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const app = express();

// Track server start time
const serverStartTime = Date.now();

// ✅ CORS FIX (clean)
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL,
      "http://localhost:5173",
      "http://localhost:3000",
    ].filter((o): o is string => Boolean(o)),
    credentials: true,
  })
);

app.use(cookieParser());

// Stripe webhook (keep raw BEFORE json)
app.use("/api/order/checkout/webhook", express.raw({ type: "*/*" }));

app.use(express.json());

// Root route
app.get("/", (req: Request, res: Response) => {
  res.send("🚀 Backend is running!");
});

// Health route
app.get("/health", (req: Request, res: Response) => {
  const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
  res.json({
    status: "OK",
    uptime,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoute);
app.use("/api/my/user", myUserRoute);
app.use("/api/my/restaurant", myRestaurantRoute);
app.use("/api/restaurant", restaurantRoute);
app.use("/api/order", orderRoute);
app.use("/api/business-insights", analyticsRoute);

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});