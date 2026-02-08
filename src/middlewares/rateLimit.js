const rateLimit = require("express-rate-limit");
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require("../config/env");

// General rate limiter for all endpoints
const limiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Strict rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  skipSuccessfulRequests: true, // Don't count successful logins
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again in 15 minutes." },
  keyGenerator: (req) => {
    // Rate limit by IP + email to prevent distributed attacks
    const email = req.body?.email || "unknown";
    return `${req.ip}-${email}`;
  },
});

// Rate limiter for registration
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registrations per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again in 1 hour." },
  keyGenerator: (req) => req.ip,
});

// Rate limiter for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 reset attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password reset attempts. Please try again in 1 hour." },
  keyGenerator: (req) => {
    const email = req.body?.email || "unknown";
    return `${req.ip}-${email}`;
  },
});

// Rate limiter for OTP verification
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 OTP attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP verification attempts. Please try again in 15 minutes." },
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip;
  },
});

module.exports = {
  limiter,
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  otpLimiter,
};
