const dotenv = require("dotenv");

dotenv.config();

const must = (k, fallback) => {
  const v = process.env[k] ?? fallback;
  if (v === undefined) throw new Error(`Missing env var: ${k}`);
  return v;
};

const bool = (v) => String(v).toLowerCase() === "true";

const NODE_ENV = process.env.NODE_ENV || "development";
const IS_PROD = NODE_ENV === "production";

// Convert TTL strings like "15m", "7d" into milliseconds.
// Supported units: s, m, h, d
const ttlToMs = (v) => {
  const s = String(v).trim();
  const m = s.match(/^(\d+)\s*([smhd])$/i);
  if (!m) throw new Error(`Invalid TTL format: "${s}" (use like 15m, 7d)`);

  const n = Number(m[1]);
  const unit = m[2].toLowerCase();
  const mult = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit];
  if (!mult) throw new Error(`Invalid TTL unit in: "${s}"`);
  return n * mult;
};

// Cookie defaults that work both on localhost and production HTTPS.
// - sameSite defaults to 'lax' (recommended)
// - secure defaults to true in production (and is forced true when sameSite='none')
const COOKIE_SAMESITE = (
  process.env.COOKIE_SAMESITE ||
  process.env.COOKIE_SAME_SITE ||
  "lax"
).toLowerCase();
const COOKIE_SECURE =
  process.env.COOKIE_SECURE !== undefined
    ? bool(process.env.COOKIE_SECURE)
    : (IS_PROD || COOKIE_SAMESITE === "none");

// Do NOT set COOKIE_DOMAIN on localhost.
// In production you may set COOKIE_DOMAIN to ".example.com" to share cookies across subdomains.
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

// Support common alias names from older configs (.env)
const ACCESS_TTL_RAW = process.env.ACCESS_TOKEN_TTL || process.env.JWT_ACCESS_EXPIRES || "15m";
const REFRESH_TTL_RAW = process.env.REFRESH_TOKEN_TTL || process.env.JWT_REFRESH_EXPIRES || "7d";

// Email verification / OTP flow token TTL (short-lived)
// You may override via VERIFY_TOKEN_TTL or EMAIL_VERIFY_TOKEN_TTL
const VERIFY_TTL_RAW =
  process.env.VERIFY_TOKEN_TTL ||
  process.env.EMAIL_VERIFY_TOKEN_TTL ||
  "15m";

module.exports = {

  NODE_ENV,
  IS_PROD,
  PORT: Number(process.env.PORT || 3000),
  APP_URL: process.env.APP_URL || process.env.FRONTEND_URL || "http://localhost:3000",

  MONGO_URI: must("MONGO_URI", "mongodb://localhost:27017/curve-comfort"),
  REDIS_URL: must("REDIS_URL", "redis://localhost:6379"),

  JWT_ACCESS_SECRET: must("JWT_ACCESS_SECRET", "dev_access_secret"),
  JWT_REFRESH_SECRET: must("JWT_REFRESH_SECRET", "dev_refresh_secret"),
  // Optional dedicated secret for verification tokens (OTP). Falls back to refresh secret.
  JWT_VERIFY_SECRET: process.env.JWT_VERIFY_SECRET || process.env.JWT_REFRESH_SECRET || "dev_refresh_secret",
  ACCESS_TOKEN_TTL: ACCESS_TTL_RAW,
  REFRESH_TOKEN_TTL: REFRESH_TTL_RAW,

  // Short-lived token used only for email verification pages
  VERIFY_TOKEN_TTL: VERIFY_TTL_RAW,

  // Derived TTLs (used for cookie maxAge)
  ACCESS_TOKEN_TTL_MS: ttlToMs(ACCESS_TTL_RAW),
  REFRESH_TOKEN_TTL_MS: ttlToMs(REFRESH_TTL_RAW),

  VERIFY_TOKEN_TTL_MS: ttlToMs(VERIFY_TTL_RAW),

  COOKIE_SECURE,
  COOKIE_DOMAIN,
  COOKIE_SAMESITE,

  // Comma-separated list is supported, e.g. "http://localhost:3000,https://app.example.com"
  CORS_ORIGIN: process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:3000",

  RABBITMQ_URL: must("RABBITMQ_URL", "amqp://localhost:5672"),
  MAIL_QUEUE: process.env.MAIL_QUEUE || "mail_queue",

  // SMTP Configuration - supports both SMTP_PASS and SMTP_PASSWORD
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: Number(process.env.SMTP_PORT || 587),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASSWORD: process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "",
  SMTP_FROM: process.env.MAIL_FROM || process.env.SMTP_FROM || "noreply@localhost",

  RATE_LIMIT_WINDOW_MS: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
  RATE_LIMIT_MAX: Number(process.env.RATE_LIMIT_MAX || 100),
};
