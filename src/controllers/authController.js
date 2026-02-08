const User = require("../models/User");
const { isEmail, minLen } = require("../utils/validators");
const { hashPassword, comparePassword, randomOtp, hashOtp, compareOtp, newJti } = require("../utils/crypto");
const {
  signAccessToken,
  signRefreshToken,
  signVerifyToken,
  verifyRefreshToken,
  verifyVerifyToken,
} = require("../utils/tokens");

const { setAuthCookies, clearAuthCookies, setVerifyCookie, clearVerifyCookie } = require("../utils/cookies");

const { enqueueMail } = require("../services/mailerQueue");
const { blacklistJti, isBlacklisted } = require("../services/blacklist");
const { NODE_ENV } = require("../config/env");

const log = (...args) => {
  if (NODE_ENV !== "production") console.log(...args);
};

const OTP_TTL_MIN = 10;

// express-ejs-layouts uses `layout` local to choose a layout file.
// Keep auth pages on the default layout unless you introduce a dedicated auth layout.
const authLayout = "layout";

const render = (res, view, locals = {}) => res.render(view, locals);


const msgMap = {
  registered: "Account created. Please log in.",
  verify_required: "Please verify your email to continue.",
  logged_out: "You have been logged out.",
  logged_out_all: "You have been logged out from all sessions.",
  password_reset: "Password updated. Please log in.",
  sent: "If the email exists, we've sent you an OTP.",
  verified: "Email verified successfully.",
};

const pickMsg = (req) => {
  const key = String(req.query?.msg || "");
  return msgMap[key] || (key ? key : null);
};

// --- Email verification flow helpers (OTP) ---
const getVerifyUser = async (req) => {
  const vt = req.cookies?.verify_token;
  if (!vt) return null;
  try {
    const payload = verifyVerifyToken(vt);
    if (!payload || payload.typ !== "verify" || !payload.sub) return null;
    return await User.findById(payload.sub);
  } catch {
    return null;
  }
};

// const authLayout = "partials/auth-layout"; // example if you add one later






const register = async (req, res) => {
  const { name, email, password } = req.body || {};
  const errors = [];

  if (!name) errors.push("Name is required");
  if (!isEmail(email)) errors.push("Valid email is required");
  if (!minLen(password, 8)) errors.push("Password must be at least 8 characters");

  
  if (errors.length)
    return render(res, "auth/register", {
      layout: authLayout,
      title: "Create Account",
      subtitle: "Create your account to get started.",
      user: req.user,
      msg: pickMsg(req),
      errors,
      values: { name, email },
    });

  const exists = await User.findOne({ email: String(email).toLowerCase() }).lean();

  if (exists)
    return render(res, "auth/login", {
      layout: authLayout,
      title: "Create Account",
      subtitle: "Create your account to get started.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Email already in use"],
      values: { name, email },
    });

  const passwordHash = await hashPassword(password);
  const otp = randomOtp();
  const otpHash = await hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

  const user = await User.create({
    name,
    email: String(email).toLowerCase(),
    passwordHash,
    emailVerified: false,
    emailOtp: { hash: otpHash, expiresAt, attempts: 0 },
  });

  await enqueueMail({
    to: user.email,
    subject: "Verify your email",
    template: "verify-email",
    data: { name: user.name, otp, ttlMinutes: OTP_TTL_MIN },
  });

  // Set a short-lived cookie to let the user verify OTP without logging in.
  const verifyToken = signVerifyToken({ sub: String(user._id) });
  setVerifyCookie(res, verifyToken);

  return res.redirect("/verify-email?msg=sent");
};

const login = async (req, res) => {
  const { email, password } = req.body || {};
  const errors = [];
  if (!isEmail(email)) errors.push("Valid email is required");
  if (!password) errors.push("Password is required");
  if (errors.length)
    return render(res, "auth/login", {
      layout: authLayout,
      title: "Welcome Back!",
      subtitle: "Log in now to explore all the features and benefits of our platform.",
      user: req.user,
      msg: pickMsg(req),
      errors,
      values: { email },
    });

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user)
    return render(res, "auth/login", {
      layout: authLayout,
      title: "Welcome Back!",
      subtitle: "Log in now to explore all the features and benefits of our platform.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Invalid credentials"],
      values: { email },
    });

  const ok = await comparePassword(password, user.passwordHash);
  if (!ok)
    return render(res, "auth/login", {
      layout: authLayout,
      title: "Welcome Back!",
      subtitle: "Log in now to explore all the features and benefits of our platform.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Invalid credentials"],
      values: { email },
    });

  // Block login until email is verified
  if (!user.emailVerified) {
    const otp = randomOtp();
    user.emailOtp = {
      hash: await hashOtp(otp),
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
      attempts: 0,
    };
    await user.save();

    await enqueueMail({
      to: user.email,
      subject: "Verify your email",
      template: "verify-email",
      data: { name: user.name, otp, ttlMinutes: OTP_TTL_MIN },
    });

    // Issue short-lived verification cookie and redirect to OTP page
    clearAuthCookies(res);
    const verifyToken = signVerifyToken({ sub: String(user._id) });
    setVerifyCookie(res, verifyToken);
    return res.redirect("/verify-email?msg=verify_required");
  }

  const accessToken = signAccessToken({ sub: String(user._id), email: user.email, tokenVersion: user.tokenVersion });
  const jti = newJti();
  const refreshToken = signRefreshToken({ sub: String(user._id), jti, tokenVersion: user.tokenVersion });

  setAuthCookies(res, { accessToken, refreshToken });

  return res.redirect("/");
};



const refreshToken = async (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (!rt) return res.status(401).json({ error: "No refresh token" });

    const payload = verifyRefreshToken(rt);
    if (payload.typ !== "refresh") return res.status(401).json({ error: "Invalid token type" });

    const bl = await isBlacklisted(payload.jti);
    if (bl) return res.status(401).json({ error: "Token revoked" });

    const user = await User.findById(payload.sub).lean();
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.tokenVersion !== payload.tokenVersion) return res.status(401).json({ error: "Session expired" });

    const now = Math.floor(Date.now() / 1000);
    const ttlSeconds = Math.max(1, (payload.exp || now) - now);
    await blacklistJti(payload.jti, ttlSeconds);

    const accessToken = signAccessToken({ sub: String(user._id), email: user.email, tokenVersion: user.tokenVersion });
    const newJ = newJti();
    const refreshToken = signRefreshToken({ sub: String(user._id), jti: newJ, tokenVersion: user.tokenVersion });

    setAuthCookies(res, { accessToken, refreshToken });
    return res.json({ ok: true });
  } catch (e) {
    return res.status(401).json({ error: "Refresh failed" });
  }
};



const logout = async (req, res) => {
  try {
    const rt = req.cookies?.refresh_token;
    if (rt) {
      try {
        const payload = verifyRefreshToken(rt);
        if (payload?.jti && payload?.exp) {
          const now = Math.floor(Date.now() / 1000);
          const ttlSeconds = Math.max(1, (payload.exp || now) - now);
          await blacklistJti(payload.jti, ttlSeconds);
        }
      } catch { }
    }
    log(`✅ User logged out`);
  } finally {
    clearAuthCookies(res);
    clearVerifyCookie(res);
    return res.redirect("/login?msg=logged_out");
  }
};

const logoutAll = async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $inc: { tokenVersion: 1 } });
  clearAuthCookies(res);
  clearVerifyCookie(res);
  log(`✅ User logged out from all devices: ${req.user.email}`);
  return res.redirect("/login?msg=logged_out_all");
};

const postSendVerifyOtp = async (req, res) => {
  const user = await getVerifyUser(req);
  if (!user) return res.redirect("/login?msg=verify_required");
  if (user.emailVerified) {
    clearVerifyCookie(res);
    return res.redirect("/login?msg=verified");
  }

  const otp = randomOtp();
  user.emailOtp = {
    hash: await hashOtp(otp),
    expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
    attempts: 0,
  };
  await user.save();

  await enqueueMail({
    to: user.email,
    subject: "Your verification code",
    template: "verify-email",
    data: { name: user.name, otp, ttlMinutes: OTP_TTL_MIN },
  });

  log(`✅ Verification OTP sent: ${user.email}`);
  return res.redirect("/verify-email?msg=sent");
};

const postVerifyEmail = async (req, res) => {
  const { otp } = req.body || {};
  const user = await getVerifyUser(req);
  if (!user) return res.redirect("/login?msg=verify_required");
  if (user.emailVerified) {
    clearVerifyCookie(res);
    return res.redirect("/login?msg=verified");
  }

  const errors = [];
  if (!otp) errors.push("OTP is required");

  const record = user.emailOtp || {};
  if (!record.hash || !record.expiresAt) errors.push("No OTP found. Resend code.");
  if (record.expiresAt && record.expiresAt.getTime() < Date.now()) errors.push("OTP expired. Resend code.");
  if (record.attempts >= 5) errors.push("Too many attempts. Resend code.");

  if (errors.length)
    return render(res, "auth/verify", {
      layout: authLayout,
      title: "Verify Email",
      subtitle: "Enter the OTP sent to your email.",
      user: req.user,
      msg: pickMsg(req),
      errors,
    });

  const ok = await compareOtp(String(otp), record.hash);
  if (!ok) {
    user.emailOtp.attempts = (user.emailOtp.attempts || 0) + 1;
    await user.save();
    return render(res, "auth/verify", {
      layout: authLayout,
      title: "Verify Email",
      subtitle: "Enter the OTP sent to your email.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Invalid OTP"],
    });
  }

  user.emailVerified = true;
  user.emailOtp = {};
  await user.save();

  log(`✅ Email verified: ${user.email}`);
  clearVerifyCookie(res);
  return res.redirect("/login?msg=verified");
};

const postForgot = async (req, res) => {
  const { email } = req.body || {};
  const user = await User.findOne({ email: String(email || "").toLowerCase() });
  if (user) {
    const otp = randomOtp();
    user.resetOtp = {
      hash: await hashOtp(otp),
      expiresAt: new Date(Date.now() + OTP_TTL_MIN * 60 * 1000),
      attempts: 0,
    };
    await user.save();
    await enqueueMail({
      to: user.email,
      subject: "Password reset code",
      template: "password-reset",
      data: { name: user.name, otp, ttlMinutes: OTP_TTL_MIN },
    });
    log(`✅ Password reset OTP sent: ${user.email}`);
  }
  return res.redirect("/reset-password?msg=sent");
};

const postReset = async (req, res) => {
  const { email, otp, password } = req.body || {};
  const errors = [];
  if (!isEmail(email)) errors.push("Valid email is required");
  if (!otp) errors.push("OTP is required");
  if (!minLen(password, 8)) errors.push("New password must be at least 8 characters");
  if (errors.length)
    return render(res, "auth/reset", {
      layout: authLayout,
      title: "Reset Password",
      subtitle: "Enter your email, OTP, and new password.",
      user: req.user,
      msg: pickMsg(req),
      errors,
    });

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user)
    return render(res, "auth/reset", {
      layout: authLayout,
      title: "Reset Password",
      subtitle: "Enter your email, OTP, and new password.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Invalid reset request"],
    });

  const record = user.resetOtp || {};
  if (!record.hash || !record.expiresAt)
    return render(res, "auth/reset", {
      layout: authLayout,
      title: "Reset Password",
      subtitle: "Enter your email, OTP, and new password.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["No reset OTP found. Request again."],
    });
  if (record.expiresAt.getTime() < Date.now())
    return render(res, "auth/reset", {
      layout: authLayout,
      title: "Reset Password",
      subtitle: "Enter your email, OTP, and new password.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Reset OTP expired. Request again."],
    });
  if (record.attempts >= 5)
    return render(res, "auth/reset", {
      layout: authLayout,
      title: "Reset Password",
      subtitle: "Enter your email, OTP, and new password.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Too many attempts. Request again."],
    });

  const ok = await compareOtp(String(otp), record.hash);
  if (!ok) {
    user.resetOtp.attempts = (user.resetOtp.attempts || 0) + 1;
    await user.save();
    return render(res, "auth/reset", {
      layout: authLayout,
      title: "Reset Password",
      subtitle: "Enter your email, OTP, and new password.",
      user: req.user,
      msg: pickMsg(req),
      errors: ["Invalid OTP"],
    });
  }

  user.passwordHash = await hashPassword(password);
  user.resetOtp = {};
  user.tokenVersion += 1;
  await user.save();

  log(`✅ Password reset completed: ${user.email}`);
  clearAuthCookies(res);
  return res.redirect("/login?msg=password_reset");
};









const registerPage = (req, res) =>

  render(res, "auth/register", {
    title: "Create Account",
    subtitle: "Create your account to get started.",
    user: req.user,
    msg: pickMsg(req),
    errors: [],
    values: {},
  });

const loginPage = (req, res) =>
  render(res, "auth/login", {
    title: "Welcome Back!",
    subtitle: "Log in now to explore all the features and benefits of our platform.",
    user: req.user,
    msg: pickMsg(req),
    errors: [],
    values: {},
  });

const verifyEmailPage = async (req, res) => {
  const verifyUser = await getVerifyUser(req);
  if (!verifyUser) return res.redirect("/login?msg=verify_required");
  if (verifyUser.emailVerified) {
    clearVerifyCookie(res);
    return res.redirect("/login?msg=verified");
  }
  return render(res, "auth/verify", {
    title: "Verify Email",
    subtitle: "Enter the OTP sent to your email.",
    user: req.user,
    msg: pickMsg(req),
    errors: [],
  });
};

const forgotPage = (req, res) =>
  render(res, "auth/forgot", {
    title: "Forgot Password",
    subtitle: "Enter your email and we'll send you a reset OTP.",
    user: req.user,
    msg: pickMsg(req),
    errors: [],
  });

const resetPage = (req, res) =>
  render(res, "auth/reset", {
    title: "Reset Password",
    subtitle: "Enter your email, OTP, and new password.",
    user: req.user,
    msg: pickMsg(req),
    errors: [],
  });

module.exports = {
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
};
