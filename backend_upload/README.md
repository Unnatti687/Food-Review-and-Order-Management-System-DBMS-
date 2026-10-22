# Restaurant Food Ordering Management System Backend - React, Express.js FullStack MERN Project (including Business-Insights Dashboard)

A production-ready, scalable backend API for the Restaurant Food Ordering Management System. Built with Node.js, Express.js, TypeScript, and MongoDB, featuring secure authentication, real-time order management, and third-party integrations.

- **Frontend-Live:** [https://food-mern-ordering.vercel.app/](https://food-mern-ordering.vercel.app/)
- **Backend-Live:** [https://food-ordering-backend.arnobmahmud.com](https://food-ordering-backend.arnobmahmud.com)

---

## Table of Contents

- [Project Summary](#project-summary)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Environment Variables (.env)](#environment-variables-env)
- [How to Run](#how-to-run)
- [Code Snippets & Reusability](#code-snippets--reusability)
- [Keywords](#keywords)
- [Conclusion](#conclusion)

---

## Project Summary

A robust, scalable backend for a modern food ordering platform. It provides RESTful APIs for user management, restaurant management, menu, order processing, and payment integration (Stripe). The backend is built with Node.js, Express, TypeScript, and MongoDB (Mongoose), and supports secure authentication via Auth0. It is designed for easy extension and integration with any frontend.

---

## Features

- User registration, authentication, and profile management (Auth0)
- Restaurant creation, editing, and menu management
- City/cuisine-based restaurant search with filtering and pagination
- Order creation, payment (Stripe), and real-time status tracking
- Admin endpoints for restaurant owners to manage orders and update statuses
- Image upload and storage via Cloudinary
- Secure JWT-based authentication middleware
- Input validation and error handling
- Modular, reusable code structure

---

## Technology Stack

- **Node.js** & **Express**: REST API server
- **TypeScript**: Type safety and maintainability
- **MongoDB** & **Mongoose**: Database and ODM
- **Stripe**: Payment processing and webhooks
- **Auth0**: Authentication and user management
- **Cloudinary**: Image upload and hosting
- **Jest** (suggested): For unit/integration testing

---

## Project Structure

```bash
food-ordering-backend/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts                # Entry point, Express app setup
│   ├── controllers/            # Route handlers (business logic)
│   ├── middleware/             # Auth, validation, etc.
│   ├── models/                 # Mongoose schemas/models
│   └── routes/                 # API route definitions
└── README.md
```

---

## API Endpoints

### User

- `GET /api/my/user` — Get current user profile
- `POST /api/my/user` — Create user (Auth0)
- `PUT /api/my/user` — Update user profile

### Restaurant

- `GET /api/my/restaurant` — Get current user's restaurant
- `POST /api/my/restaurant` — Create restaurant (with image upload)
- `PUT /api/my/restaurant` — Update restaurant
- `GET /api/restaurant/cities/all` — Get all unique cities
- `GET /api/restaurant/:restaurantId` — Get restaurant by ID
- `GET /api/restaurant/search/:city` — Search restaurants by city, cuisine, etc.

### Orders

- `GET /api/order` — Get current user's active orders
- `POST /api/order/checkout/create-checkout-session` — Create Stripe checkout session
- `POST /api/order/checkout/webhook` — Stripe webhook endpoint

### Restaurant Owner Orders

- `GET /api/my/restaurant/order` — Get all orders for your restaurant
- `PATCH /api/my/restaurant/order/:orderId/status` — Update order status

### Business Insights

- `GET /api/business-insights` — Get analytics and business insights data

---

## Environment Variables (.env)

Create a `.env` file in the root of `food-ordering-backend/` with the following variables:

```env
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
STRIPE_API_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
AUTH0_AUDIENCE=your_auth0_audience
AUTH0_ISSUER_BASE_URL=your_auth0_issuer_base_url
FRONTEND_URL=http://localhost:5173 # or your deployed frontend URL
```

- Get MongoDB URI from your MongoDB Atlas dashboard.
- Get Cloudinary credentials from your Cloudinary dashboard.
- Get Stripe API keys and webhook secret from your Stripe dashboard.
- Get Auth0 values from your Auth0 dashboard (Applications > APIs).
- Set FRONTEND_URL to your frontend's base URL.

---

## How to Run

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Set up your `.env` file** as described above.
3. **Build TypeScript:**

   ```bash
   npm run build
   ```

4. **Start the server (dev mode):**

   ```bash
   npm run dev
   ```

   - This runs both the backend and Stripe webhook listener concurrently.

5. **Production start:**

   ```bash
   npm start
   ```

---

## Code Snippets & Reusability

### Example: Protecting a Route with Auth Middleware

```ts
import { jwtCheck, jwtParse } from "../middleware/auth";
router.get("/protected", jwtCheck, jwtParse, (req, res) => { ... });
```

### Example: Creating a New Restaurant

```ts
router.post(
  "/",
  upload.single("imageFile"),
  validateMyRestaurantRequest,
  jwtCheck,
  jwtParse,
  MyRestaurantController.createMyRestaurant,
);
```

### Example: Stripe Checkout Session

```ts
router.post(
  "/checkout/create-checkout-session",
  jwtCheck,
  jwtParse,
  OrderController.createCheckoutSession,
);
```

- All controllers and middleware are modular and can be reused in other Express projects.
- Models are standard Mongoose schemas, easily portable.
- Validation logic is separated for easy extension.

---

## Keywords

food ordering, backend, Node.js, Express, TypeScript, MongoDB, Stripe, Auth0, Cloudinary, REST API, restaurant, order, user, JWT, Mongoose, payment, delivery, modular, reusable

---

## Conclusion

BigHungers backend is a production-ready, extensible foundation for any food ordering or delivery platform. It demonstrates best practices in API design, authentication, payment integration, and modular code organization. Use it as a learning resource or as a base for your own projects.

---

## Happy Coding! 🎉

This is an **open-source project** - feel free to use, enhance, and extend this project further!

If you have any questions or want to share your work, reach out via GitHub or my portfolio at [https://www.arnobmahmud.com/](https://www.arnobmahmud.com/).

**Enjoy building and learning!** 🚀

Thank you! 😊
