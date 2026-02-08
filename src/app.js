const express = require("express");
const path = require("path");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const expressLayouts = require("express-ejs-layouts");

const { NODE_ENV, IS_PROD, CORS_ORIGIN } = require("./config/env");


// Middlewares
const { requestId, helmetConfig,  } = require("./middlewares/security");
const { errorHandler } = require("./middlewares/errorHandler");
const { attachUserIfAny } = require("./middlewares/auth");


// routes 
const authRoutes = require("./routes/authRoutes");
const pageRoutes = require("./routes/pageRoutes");
const addressRoutes = require("./routes/addressRoute");



const createApp = () => {


  const app = express();

  // If running behind a reverse proxy in production (nginx, render, heroku, etc.)
  // this ensures req.secure and client ip are resolved correctly.
  if (IS_PROD) app.set("trust proxy", 1);

  // Request tracking
  app.use(requestId);


  // Security
  app.use(helmetConfig());
  app.use(
    cors({
      // Best practice: allow a configured allow-list. Supports comma-separated list.
      origin: (origin, cb) => {
        const allowed = String(CORS_ORIGIN || "").split(",").map((s) => s.trim()).filter(Boolean);
        // Same-origin or non-browser clients may omit Origin.
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
  if (NODE_ENV !== "test") app.use(morgan("dev"));

  // Views

  app.set("view engine", "ejs");
  app.use(expressLayouts);
  app.set("layout", "layout");
  app.set("views", path.join(__dirname, "views"));


  // Attach user 
  app.use(attachUserIfAny);

  // Default view locals (prevents EJS ReferenceError when a route doesn't set them)
  app.use((req, res, next) => {
    res.locals.title = res.locals.title || "SecureEJS";
    res.locals.user = res.locals.user || null;
    res.locals.msg = res.locals.msg || null;
    res.locals.errors = res.locals.errors || [];
    res.locals.values = res.locals.values || {};
    next();
  });

  app.use((req, res, next) => {
    res.setHeader(
      "Content-Security-Policy",
      "font-src 'self' data: https://fonts.gstatic.com;"
    );
    next();
  });



  // Static
  app.use("/", express.static(path.join(__dirname, "public")));



  app.use("/api/user/address" , addressRoutes )

  // Routes
  app.use(authRoutes);
  app.use(pageRoutes);


  

  // Health
  app.get("/health", (_req, res) => res.json({ ok: true }));

  // 404
  app.use((_req, res) => res.status(404).render("404", { user: null }));


  // Error handler (must be last)
  app.use(errorHandler);

  return app;
};

module.exports = { createApp };
