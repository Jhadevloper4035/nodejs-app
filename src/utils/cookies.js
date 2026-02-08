const {
  COOKIE_SECURE,
  COOKIE_DOMAIN,
  COOKIE_SAMESITE,
  NODE_ENV,
  ACCESS_TOKEN_TTL_MS,   // e.g. 10 * 60 * 1000
  REFRESH_TOKEN_TTL_MS,  // e.g. 7 * 24 * 60 * 60 * 1000
  VERIFY_TOKEN_TTL_MS,   // e.g. 15 * 60 * 1000
} = require("../config/env");

const baseCookie = () => ({
  httpOnly: true,
  // Browsers require Secure when SameSite=None
  secure: (String(COOKIE_SAMESITE || "lax").toLowerCase() === "none")
    ? true
    : (COOKIE_SECURE ?? NODE_ENV === "production"),
  sameSite: String(COOKIE_SAMESITE || "lax").toLowerCase(),
  domain: COOKIE_DOMAIN,              // keep undefined on localhost
  path: "/",
});

const accessCookie = () => ({
  ...baseCookie(),
  maxAge: ACCESS_TOKEN_TTL_MS,
});

const refreshCookie = () => ({
  ...baseCookie(),
  maxAge: REFRESH_TOKEN_TTL_MS,
  path: "/", // tighter scope is better
});

const verifyCookie = () => ({
  ...baseCookie(),
  maxAge: VERIFY_TOKEN_TTL_MS,
  path: "/verify-email",
});

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie("access_token", accessToken, accessCookie());
  res.cookie("refresh_token", refreshToken, refreshCookie());
};

// Used ONLY for email verification flow (OTP). Not a session.
const setVerifyCookie = (res, verifyToken) => {
  res.cookie("verify_token", verifyToken, verifyCookie());
};

const clearAuthCookies = (res) => {
  res.clearCookie("access_token", accessCookie());
  res.clearCookie("refresh_token", refreshCookie());
};

const clearVerifyCookie = (res) => {
  res.clearCookie("verify_token", verifyCookie());
};

module.exports = { setAuthCookies, clearAuthCookies, setVerifyCookie, clearVerifyCookie };
