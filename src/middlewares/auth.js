
const {
  verifyAccessToken,
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
} = require("../utils/tokens");

const { isBlacklisted, blacklistJti } = require("../services/blacklist");
const { setAuthCookies, clearAuthCookies } = require("../utils/cookies");
const { newJti } = require("../utils/crypto");
const User = require("../models/User");
const { NODE_ENV } = require("../config/env");
const Cart = require("../models/cart");

const log = (...args) => {
  if (NODE_ENV !== "production") console.log(...args);
};

/**
 * ------------------------------------------------------------------
 * INTERNAL: Try access token → fallback to refresh token
 * ------------------------------------------------------------------
 */
const verifyOrRefreshAccess = async (req, res) => {
  const accessToken = req.cookies?.access_token;
  const refreshToken = req.cookies?.refresh_token;

  //log("Verifying access token:", accessToken );
  //log("Verifying refresh token:", refreshToken );

  if (accessToken) {
    try {
      const payload = verifyAccessToken(accessToken);
      if (payload.typ !== "access") throw new Error("Wrong token");

      if (payload.jti) {
        const revoked = await isBlacklisted(payload.jti);
        if (revoked) throw new Error("Access revoked");
      }

      const user = await User.findById(payload.sub).lean();
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        throw new Error("Session invalid");
      }

      return {
        user: {
          id: String(user._id),
          email: user.email,
          name: user.name || user.email.split("@")[0],
          emailVerified: user.emailVerified,
          tokenVersion: user.tokenVersion,
        },
      };
    } catch {
      // fall through to refresh
    }
  }


  if (!refreshToken) return null;

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.typ !== "refresh") return null;
    if (!payload.jti) return null;

    const revoked = await isBlacklisted(payload.jti);
    if (revoked) return null;

    const user = await User.findById(payload.sub).lean();
    if (!user || user.tokenVersion !== payload.tokenVersion) return null;

    // 🔁 blacklist old refresh token
    const now = Math.floor(Date.now() / 1000);
    const ttl = Math.max(1, payload.exp - now);
    await blacklistJti(payload.jti, ttl);

    // 🔐 issue NEW tokens
    const newAccessToken = signAccessToken({
      sub: String(user._id),
      email: user.email,
      tokenVersion: user.tokenVersion,
    });

    const newRefreshToken = signRefreshToken({
      sub: String(user._id),
      jti: newJti(),
      tokenVersion: user.tokenVersion,
    });

    // 🍪 set cookies
    setAuthCookies(res, {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });

    log("Refreshed tokens for user:", user.email);

    return {
      user: {
        id: String(user._id),
        email: user.email,
        name: user.name || user.email.split("@")[0],
        emailVerified: user.emailVerified,
        tokenVersion: user.tokenVersion,
      },
    };
  } catch {
    return null;
  }
};

/**
 * ------------------------------------------------------------------
 * GLOBAL (SAFE) — UI / Navbar / Public pages
 * ------------------------------------------------------------------
 */
const attachUserIfAny = async (req, res, next) => {
  const result = await verifyOrRefreshAccess(req, res);
  req.user = result?.user || null;
  res.locals.user = req.user;
  next();
};



const attchCartCount = async (req, res, next) => {
  try {
    // If user not logged in
    if (!req.user || !req.user.id) {
      res.locals.cartCount = 0;
      return next();
    }

    const userId = req.user.id;

    let cart = await Cart.findOne({ userId });

    // Create cart if not exists
    if (!cart) {
      cart = await Cart.create({ userId, items: [] });
    }

    // Calculate total items (sum of quantities)
    const totalItems = cart.items.reduce(
      (sum, item) => sum + (item.quantity || 0),
      0
    );

    res.locals.cartCount = totalItems;

    next();
  } catch (err) {
    console.error("Cart count middleware error:", err);
    res.locals.cartCount = 0;
    next(); // continue even if error
  }
};



/**
 * ------------------------------------------------------------------
 * PAGES (PROTECTED)
 * ------------------------------------------------------------------
 */
const requireAuth = async (req, res, next) => {
  const result = await verifyOrRefreshAccess(req, res);
  if (!result) {
    clearAuthCookies(res);
    return res.redirect("/login");
  }

  req.user = result.user;
  res.locals.user = result.user;
  next();
};

/**
 * ------------------------------------------------------------------
 * EMAIL VERIFIED
 * ------------------------------------------------------------------
 */
const requireVerified = (req, res, next) => {
  if (!req.user) return res.redirect("/login");
  if (!req.user.emailVerified) return res.redirect("/verify-email");
  next();
};

/**
 * ------------------------------------------------------------------
 * API AUTH (JSON)
 * ------------------------------------------------------------------
 */
const requireApiAuth = async (req, res, next) => {
  const result = await verifyOrRefreshAccess(req, res);
  if (!result) return res.status(401).json({ error: "Unauthorized" });

  req.user = result.user;
  next();
};

module.exports = {
  attachUserIfAny,
  requireAuth,
  requireVerified,
  requireApiAuth,
  attchCartCount
};
