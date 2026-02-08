const express = require("express");

const {
  registerPage,
  loginPage,
  verifyEmailPage,
  forgotPage,
  resetPage,
  register,
  login,
  refreshToken,
  logout,
  logoutAll,
  postSendVerifyOtp,
  postVerifyEmail,
  postForgot,
  postReset,
} = require("../controllers/authController");

const { requireAuth } = require("../middlewares/auth");

const {
  authLimiter,
  registerLimiter,
  passwordResetLimiter,
  otpLimiter,
} = require("../middlewares/rateLimit");

const router = express.Router();

// Public pages
router.get("/register", registerPage);
router.get("/login", loginPage);
router.get("/forgot-password", forgotPage);
router.get("/reset-password", resetPage);

// Public actions with enhanced rate limiting
router.post("/register", registerLimiter, register);
router.post("/login", authLimiter, login);
router.post("/refresh", refreshToken);
router.post("/forgot-password", passwordResetLimiter, postForgot);
router.post("/reset-password", passwordResetLimiter, postReset);



// Email verification (OTP) pages/actions
// These are public and rely on the short-lived verify_token cookie set during register/login.
router.get("/verify-email", verifyEmailPage);
router.post("/verify-email", otpLimiter, postVerifyEmail);
router.post("/verify-email/resend", otpLimiter, postSendVerifyOtp);

router.post("/logout", logout);
router.post("/logout-all", requireAuth, logoutAll);

module.exports = router;
