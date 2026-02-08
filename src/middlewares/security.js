const helmet = require("helmet");
const { v4: uuidv4 } = require("uuid");

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// Debug only if explicitly enabled (no default spam)
const DEBUG_SECURITY = process.env.DEBUG_SECURITY === "true";

const requestId = (req, res, next) => {
  const rid = uuidv4();
  req.id = rid;
  res.setHeader("X-Request-ID", rid);
  next();
};

// Helmet config: HSTS only in production (important)
const helmetConfig = () => {
  const cfg = {
    // CSP often breaks EJS/inline scripts in dev; enable in prod, relaxed in dev
    contentSecurityPolicy: IS_PROD
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "https://cdn.tailwindcss.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            upgradeInsecureRequests: [],
          },
        }
      : false,

    // ✅ HSTS should NEVER be enabled on localhost/dev
    hsts: IS_PROD
      ? { maxAge: 31536000, includeSubDomains: true, preload: true }
      : false,

    frameguard: { action: "deny" },
    noSniff: true,
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  };

  if (DEBUG_SECURITY) {
    console.log("[SECURITY] helmet configured", {
      env: NODE_ENV,
      csp: !!cfg.contentSecurityPolicy,
      hsts: !!cfg.hsts,
    });
  }

  return helmet(cfg);
};

module.exports = {
  requestId,
  helmetConfig,
};
