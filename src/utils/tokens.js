const jwt = require("jsonwebtoken");
const {
  JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET,
  JWT_VERIFY_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  VERIFY_TOKEN_TTL,
} = require("../config/env");

const signAccessToken = ({ sub, email, tokenVersion }) =>
  jwt.sign({ sub, email, tokenVersion, typ: "access" }, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });

const signRefreshToken = ({ sub, jti, tokenVersion }) =>
  jwt.sign({ sub, jti, tokenVersion, typ: "refresh" }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_TTL });

// Short-lived token used only to identify the user during email verification (OTP) flow.
// This is NOT an auth/session token.
const signVerifyToken = ({ sub }) =>
  jwt.sign({ sub, typ: "verify" }, JWT_VERIFY_SECRET, { expiresIn: VERIFY_TOKEN_TTL });

const verifyAccessToken = (token) => jwt.verify(token, JWT_ACCESS_SECRET);
const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET);
const verifyVerifyToken = (token) => jwt.verify(token, JWT_VERIFY_SECRET);

module.exports = {
  signAccessToken,
  signRefreshToken,
  signVerifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyVerifyToken,
};
