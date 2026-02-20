const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");

const { NODE_ENV, IS_PROD, CORS_ORIGIN } = require("./config/env");

// Middlewares
const { requestId, helmetConfig } = require("./middlewares/security");
const { errorHandler } = require("./middlewares/errorHandler");
const { attachUserIfAny } = require("./middlewares/auth");

// Routes
const authRoutes = require("./routes/authRoutes");
const pageRoutes = require("./routes/pageRoutes");
const addressRoutes = require("./routes/addressRoute");
const categoryRoutes = require("./routes/categoryRoute");
const productRoutes = require("./routes/productRoute");
const cartRoutes = require("./routes/cartRoute")

const { connectRedis } = require("./config/redis");
const { categoryMiddleware } = require("./middlewares/categoryMiddleware");

const createApp = () => {
  const app = express();

  if (IS_PROD) app.set("trust proxy", 1);

  app.use(requestId);
  app.use(helmetConfig());

  app.use(
    cors({
      origin: (origin, cb) => {
        const allowed = String(CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
        if (!origin) return cb(null, true);
        if (allowed.length === 0) return cb(null, true);
        return allowed.includes(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"));
      },
      credentials: true,
    })
  );

  // Parsers
  app.use(express.urlencoded({ extended: false, limit: "10mb" }));
  app.use(express.json({ limit: "10mb" }));
  app.use(cookieParser());

  // Logs
  // if (NODE_ENV !== "test") app.use(morgan("dev")); 

  // Views
  app.set("view engine", "ejs");
  app.use(expressLayouts);
  app.set("layout", "layout");
  app.set("views", path.join(__dirname, "views"));

  // ✅ Static BEFORE routes
  app.use("/", express.static(path.join(__dirname, "public")));

  // Attach user
  app.use(attachUserIfAny);

  // Attch category adn subcategory
  app.use(categoryMiddleware);

  // Default view locals
  app.use((req, res, next) => {
    res.locals.title = res.locals.title || "SecureEJS";
    res.locals.user = res.locals.user || null;
    res.locals.msg = res.locals.msg || null;
    res.locals.errors = res.locals.errors || [];
    res.locals.values = res.locals.values || {};
    res.locals.categories = res.locals.categories || []; // ✅ added default
    next();
  });

  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "font-src 'self' data: https://fonts.gstatic.com;"
    );
    next();
  });


  // API Routes
  app.use("/api/user/address", addressRoutes);
  app.use("/api/categories", categoryRoutes);
  app.use("/api/products", productRoutes);
  app.use("/api/cart", cartRoutes);

  // Page Routes
  app.use(authRoutes);
  app.use(pageRoutes);

  // Health
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // 404
  app.use((_req, res) => res.status(404).render("404", { user: null, categories: [] })); // ✅ added categories

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

// ✅ initializeApp moved outside createApp and exported
const initializeApp = async () => {
  try {
    await connectRedis();
    await categoryCache.init();
    console.log("✅ App initialized successfully");
  } catch (error) {
    console.error("❌ Failed to initialize app:", error);
    process.exit(1);
  }
};

module.exports = { createApp, initializeApp };