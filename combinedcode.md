
import { Request, Response } from "express";
import Order from "../models/order";
import Restaurant from "../models/restaurant";
import User from "../models/user";

const getAnalyticsData = async (req: Request, res: Response) => {
  try {
    console.log("Analytics API called with timeRange:", req.query.timeRange);

    // Get time range from query params (default to 30 days)
    const timeRange = req.query.timeRange || "30d";
    const days =
      timeRange === "7d"
        ? 7
        : timeRange === "90d"
        ? 90
        : timeRange === "1y"
        ? 365
        : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log("Fetching orders from:", startDate.toISOString());

    // Get all orders within the time range
    const orders = await Order.find({
      createdAt: { $gte: startDate },
    })
      .populate("restaurant")
      .populate("user");

    console.log("Found orders:", orders.length);
    console.log("Orders count:", orders.length);

    // Calculate total orders
    const totalOrders = orders.length;

    // Calculate total revenue (sum of totalAmount)
    const totalRevenue = orders.reduce((sum: number, order: any) => {
      const amount = order.totalAmount || 0;
      return sum + amount;
    }, 0);

    // Calculate average order value
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    console.log("Total revenue:", totalRevenue);
    console.log("Average order value:", averageOrderValue);

    // Get unique customers
    const uniqueCustomers = new Set(
      orders
        .filter((order: any) => order.user)
        .map((order: any) => order.user.toString())
    ).size;

    console.log("Unique customers:", uniqueCustomers);

    // Get top cities by orders
    const cityStats = orders
      .filter(
        (order: any) => order.deliveryDetails && order.deliveryDetails.city
      )
      .reduce((acc, order: any) => {
        const city = order.deliveryDetails.city;
        if (!acc[city]) {
          acc[city] = { orders: 0, revenue: 0 };
        }
        acc[city].orders += 1;
        acc[city].revenue += order.totalAmount || 0;
        return acc;
      }, {} as Record<string, { orders: number; revenue: number }>);

    const topCities = Object.entries(cityStats)
      .map(([city, stats]) => ({
        city,
        orders: stats.orders,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.orders - a.orders)
      .slice(0, 5);

    console.log("Top cities:", topCities);

    // Get top cuisines from restaurants (real calculation)
    const cuisineStats: Record<string, number> = {};

    // Count orders by cuisine - each order counts once per cuisine
    orders.forEach((order: any) => {
      if (order.restaurant && order.restaurant.cuisines) {
        // For each order, count it once for each cuisine the restaurant offers
        order.restaurant.cuisines.forEach((cuisine: string) => {
          cuisineStats[cuisine] = (cuisineStats[cuisine] || 0) + 1;
        });
      }
    });

    // Convert to array and sort by order count
    const topCuisines = Object.entries(cuisineStats)
      .map(([cuisine, count]) => ({
        cuisine,
        orders: count,
        percentage: Math.round((count / totalOrders) * 100 * 100) / 100, // Round to 2 decimal places
      }))
      .sort((a, b) => b.orders - a.orders);
    // Removed .slice(0, 10) to show ALL cuisines

    console.log("Top cuisines:", topCuisines);

    // Get recent orders - show ALL orders within the time range, not just 5
    const recentOrders = orders
      .filter((order: any) => order.deliveryDetails)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      // Removed .slice(0, 5) to show ALL orders within the time range
      .map((order: any) => ({
        id: order._id.toString(),
        customer: order.deliveryDetails.name,
        amount: order.totalAmount || 0,
        status: order.status,
        date: order.createdAt.toISOString().split("T")[0],
      }));

    console.log("Recent orders:", recentOrders);

    // Calculate monthly data
    const monthlyData = [];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    for (let i = 0; i < 12; i++) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - (11 - i));
      monthStart.setDate(1);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const monthOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= monthStart && orderDate <= monthEnd;
      });

      const monthRevenue = monthOrders.reduce((sum: number, order: any) => {
        const amount = order.totalAmount || 0;
        return sum + amount;
      }, 0);

      monthlyData.push({
        month: months[monthStart.getMonth()],
        orders: monthOrders.length,
        revenue: monthRevenue,
      });
    }

    console.log("Monthly data:", monthlyData);

    // Calculate growth by comparing current period with previous period
    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const previousOrders = await Order.find({
      createdAt: {
        $gte: previousStartDate,
        $lt: startDate,
      },
    });

    const previousTotalRevenue = previousOrders.reduce(
      (sum: number, order: any) => {
        return sum + (order.totalAmount || 0);
      },
      0
    );

    const previousTotalOrders = previousOrders.length;

    // More intelligent growth calculation
    let orderGrowth = 0;
    let revenueGrowth = 0;

    // Check if this is a new business (less than 60 days of data)
    const firstOrder = await Order.findOne().sort({ createdAt: 1 });
    const businessAge = firstOrder
      ? Math.floor(
          (new Date().getTime() - new Date(firstOrder.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : 0;

    if (businessAge < 60) {
      // For new businesses, show month-over-month comparison instead
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const currentMonthOrders = await Order.find({
        createdAt: {
          $gte: new Date(currentYear, currentMonth, 1),
          $lt: new Date(currentYear, currentMonth + 1, 1),
        },
      });

      const previousMonthOrders = await Order.find({
        createdAt: {
          $gte: new Date(previousYear, previousMonth, 1),
          $lt: new Date(previousYear, previousMonth + 1, 1),
        },
      });

      const currentMonthRevenue = currentMonthOrders.reduce(
        (sum: number, order: any) => sum + (order.totalAmount || 0),
        0
      );
      const previousMonthRevenue = previousMonthOrders.reduce(
        (sum: number, order: any) => sum + (order.totalAmount || 0),
        0
      );

      if (previousMonthOrders.length === 0 && currentMonthOrders.length > 0) {
        orderGrowth = 100; // New month with orders
        revenueGrowth = 100;
      } else if (previousMonthOrders.length > 0) {
        orderGrowth = Math.round(
          ((currentMonthOrders.length - previousMonthOrders.length) /
            previousMonthOrders.length) *
            100
        );
        revenueGrowth = Math.round(
          ((currentMonthRevenue - previousMonthRevenue) /
            previousMonthRevenue) *
            100
        );
      } else {
        orderGrowth = 0;
        revenueGrowth = 0;
      }

      console.log("Month-over-month comparison:", {
        currentMonth: `${currentYear}-${currentMonth + 1}`,
        previousMonth: `${previousYear}-${previousMonth + 1}`,
        currentOrders: currentMonthOrders.length,
        previousOrders: previousMonthOrders.length,
        currentRevenue: currentMonthRevenue,
        previousRevenue: previousMonthRevenue,
      });
    } else {
      // For established businesses, use period-over-period comparison
      if (previousTotalOrders === 0 && totalOrders > 0) {
        orderGrowth = 100;
        revenueGrowth = 100;
      } else if (previousTotalOrders > 0) {
        orderGrowth = Math.round(
          ((totalOrders - previousTotalOrders) / previousTotalOrders) * 100
        );
        revenueGrowth = Math.round(
          ((totalRevenue - previousTotalRevenue) / previousTotalRevenue) * 100
        );
      } else {
        orderGrowth = 0;
        revenueGrowth = 0;
      }
    }

    console.log("Current period:", {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      orders: totalOrders,
      revenue: totalRevenue,
    });
    console.log("Previous period:", {
      startDate: previousStartDate.toISOString(),
      endDate: startDate.toISOString(),
      orders: previousTotalOrders,
      revenue: previousTotalRevenue,
    });
    console.log("Growth calculations:", { orderGrowth, revenueGrowth });

    const analyticsData = {
      totalOrders,
      totalRevenue,
      averageOrderValue,
      totalCustomers: uniqueCustomers,
      orderGrowth,
      revenueGrowth,
      topCities,
      topCuisines,
      recentOrders,
      monthlyData,
    };

    console.log("Sending analytics response:", analyticsData);
    res.json(analyticsData);
  } catch (error) {
    console.log("Analytics error:", error);
    console.log(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    res.status(500).json({ message: "Error fetching analytics data" });
  }
};

export default {
  getAnalyticsData,
};
import { Request, Response } from "express";
import Restaurant from "../models/restaurant";
import cloudinary from "cloudinary";
import mongoose from "mongoose";
import Order from "../models/order";

const getMyRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });
    // Return null when no restaurant (allows frontend to show create form)
    res.json(restaurant ?? null);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Error fetching restaurant" });
  }
};

const createMyRestaurant = async (req: Request, res: Response) => {
  try {
    const existingRestaurant = await Restaurant.findOne({ user: req.userId });

    if (existingRestaurant) {
      return res
        .status(409)
        .json({ message: "User restaurant already exists" });
    }

    const imageUrl = await uploadImage(req.file as Express.Multer.File);

    // Convert deliveryPrice and menuItems.price to integer pence/cents
    const deliveryPrice = req.body.deliveryPrice
      ? Math.round(parseFloat(req.body.deliveryPrice) * 100)
      : 0;
    const menuItems = Array.isArray(req.body.menuItems)
      ? req.body.menuItems.map((item: any) => ({
          ...item,
          price: item.price ? Math.round(parseFloat(item.price) * 100) : 0,
        }))
      : [];

    const restaurant = new Restaurant({
      ...req.body,
      deliveryPrice,
      menuItems,
    });
    restaurant.imageUrl = imageUrl;
    restaurant.user = new mongoose.Types.ObjectId(req.userId);
    restaurant.lastUpdated = new Date();
    await restaurant.save();

    res.status(201).send(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const updateMyRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({
      user: req.userId,
    });

    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    // Convert deliveryPrice and menuItems.price to integer pence/cents
    restaurant.restaurantName = req.body.restaurantName;
    restaurant.city = req.body.city;
    restaurant.country = req.body.country;
    restaurant.deliveryPrice = req.body.deliveryPrice
      ? Math.round(parseFloat(req.body.deliveryPrice) * 100)
      : 0;
    restaurant.estimatedDeliveryTime = req.body.estimatedDeliveryTime;
    restaurant.cuisines = req.body.cuisines;
    restaurant.menuItems = Array.isArray(req.body.menuItems)
      ? req.body.menuItems.map((item: any) => ({
          ...item,
          price: item.price ? Math.round(parseFloat(item.price) * 100) : 0,
        }))
      : [];
    restaurant.lastUpdated = new Date();

    if (req.file) {
      const imageUrl = await uploadImage(req.file as Express.Multer.File);
      restaurant.imageUrl = imageUrl;
    }

    await restaurant.save();
    res.status(200).send(restaurant);
  } catch (error) {
    console.log("error", error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

const getMyRestaurantOrders = async (req: Request, res: Response) => {
  try {
    const restaurant = await Restaurant.findOne({ user: req.userId });
    if (!restaurant) {
      return res.json([]);
    }

    // Return all orders for this restaurant, including 'placed' (unpaid) orders
    const orders = await Order.find({
      restaurant: restaurant._id,
    })
      .populate("restaurant")
      .populate("user");

    res.json(orders);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    // Validate that orderId is a valid MongoDB ObjectId
    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        message: "Invalid order ID format",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: "order not found" });
    }

    const restaurant = await Restaurant.findById(order.restaurant);

    if (restaurant?.user?._id.toString() !== req.userId) {
      return res.status(401).send();
    }

    order.status = status;
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "unable to update order status" });
  }
};

const uploadImage = async (file: Express.Multer.File) => {
  const image = file;
  // Ensure image.buffer is a Buffer or Uint8Array for Buffer.from
  const buffer: Buffer = Buffer.isBuffer(image.buffer)
    ? image.buffer
    : Buffer.from(image.buffer as ArrayBuffer);
  const base64Image = buffer.toString("base64");
  const dataURI = `data:${image.mimetype};base64,${base64Image}`;

  const uploadResponse = await cloudinary.v2.uploader.upload(dataURI);
  return uploadResponse.url;
};

export default {
  updateOrderStatus,
  getMyRestaurantOrders,
  getMyRestaurant,
  createMyRestaurant,
  updateMyRestaurant,
};
import { Request, Response } from "express";
import User from "../models/user";

const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const currentUser = await User.findOne({ _id: req.userId });
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(currentUser);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};

const createCurrentUser = async (req: Request, res: Response) => {
  try {
    const existingUser = await User.findById(req.userId);
    if (existingUser) {
      return res.status(200).send();
    }
    res.status(404).json({ message: "User not found" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error creating user" });
  }
};

const updateCurrentUser = async (req: Request, res: Response) => {
  try {
    const { name, addressLine1, country, city } = req.body;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.name = name;
    user.addressLine1 = addressLine1;
    user.city = city;
    user.country = country;

    await user.save();

    res.send(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error updating user" });
  }
};

export default {
  getCurrentUser,
  createCurrentUser,
  updateCurrentUser,
};
import { Request, Response } from "express";
import mongoose from "mongoose";
import Restaurant from "../models/restaurant";

const getRestaurant = async (req: Request, res: Response) => {
  try {
    const restaurantId = req.params.restaurantId;

    // Validate that restaurantId is a valid MongoDB ObjectId
    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({
        message: "Invalid restaurant ID format",
      });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ message: "restaurant not found" });
    }

    res.json(restaurant);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "something went wrong" });
  }
};

const searchRestaurant = async (req: Request, res: Response) => {
  try {
    const city = req.params.city;
    const searchQuery = (req.query.searchQuery as string) || "";
    const selectedCuisines = (req.query.selectedCuisines as string) || "";
    const sortOption = (req.query.sortOption as string) || "lastUpdated";
    const page = parseInt(req.query.page as string) || 1;

    let query: any = {};

    // If city is 'all' or empty, do not filter by city
    if (city && city.toLowerCase() !== "all") {
      query["city"] = new RegExp(city, "i");
    }

    if (selectedCuisines) {
      const cuisinesArray = selectedCuisines
        .split(",")
        .map((cuisine) => new RegExp(cuisine, "i"));
      query["cuisines"] = { $all: cuisinesArray };
    }

    if (searchQuery) {
      const searchRegex = new RegExp(searchQuery, "i");
      query["$or"] = [
        { restaurantName: searchRegex },
        { cuisines: { $in: [searchRegex] } },
      ];
    }

    const pageSize = 10;
    const skip = (page - 1) * pageSize;

    const restaurants = await Restaurant.find(query)
      .sort({ [sortOption]: 1 })
      .skip(skip)
      .limit(pageSize)
      .lean();

    const total = await Restaurant.countDocuments(query);

    const response = {
      data: restaurants,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / pageSize),
      },
    };

    res.json(response);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

// New endpoint to get all unique cities for dropdown
const getAllCities = async (req: Request, res: Response) => {
  try {
    const cities = await Restaurant.distinct("city");
    res.json({ cities });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong" });
  }
};

export default {
  getRestaurant,
  searchRestaurant,
  getAllCities,
};
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies["session_id"];
  }

  if (!token) {
    return res.status(401).json({ message: "unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY as string);
    req.userId = (decoded as JwtPayload).userId;
    next();
  } catch {
    return res.status(401).json({ message: "unauthorized" });
  }
};

export default verifyToken;
import { body, validationResult } from "express-validator";
import { Request, Response, NextFunction } from "express";

const handleValidationErrors = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateMyUserRequest = [
  body("name").isString().notEmpty().withMessage("Name must be a string"),
  body("addressLine1")
    .isString()
    .notEmpty()
    .withMessage("AddressLine1 must be a string"),
  body("city").isString().notEmpty().withMessage("City must be a string"),
  body("country").isString().notEmpty().withMessage("Country must be a string"),
  handleValidationErrors,
];

export const validateMyRestaurantRequest = [
  body("restaurantName").notEmpty().withMessage("Restaurant name is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("country").notEmpty().withMessage("Country is required"),
  body("deliveryPrice")
    .isFloat({ min: 0 })
    .withMessage("Delivery price must be a positive number"),
  body("estimatedDeliveryTime")
    .isInt({ min: 0 })
    .withMessage("Estimated delivery time must be a postivie integar"),
  body("cuisines")
    .isArray()
    .withMessage("Cuisines must be an array")
    .not()
    .isEmpty()
    .withMessage("Cuisines array cannot be empty"),
  body("menuItems").isArray().withMessage("Menu items must be an array"),
  body("menuItems.*.name").notEmpty().withMessage("Menu item name is required"),
  body("menuItems.*.price")
    .isFloat({ min: 0 })
    .withMessage("Menu item price is required and must be a postive number"),
  handleValidationErrors,
];
