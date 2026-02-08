const isEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || ""));
const minLen = (s, n) => String(s || "").length >= n;

// Enhanced password strength validator
const isStrongPassword = (password) => {
  if (typeof password !== "string" || password.length < 8) return false;
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
};

// HTML sanitization (prevents XSS)
const sanitizeHtml = (str) => {
  if (typeof str !== "string") return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

// SQL injection pattern detection
const hasSqlInjection = (str) => {
  if (typeof str !== "string") return false;
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
    /(--|\/\*|\*\/|;|'|")/,
    /(\bOR\b.*=.*|AND.*=.*)/i,
  ];
  return sqlPatterns.some((pattern) => pattern.test(str));
};

// NoSQL injection prevention
const hasNoSqlInjection = (obj) => {
  if (typeof obj === "string") {
    // Check for MongoDB operators in strings
    return /[${}]/.test(obj);
  }
  if (typeof obj === "object" && obj !== null) {
    // Check for MongoDB operators in object keys
    const keys = Object.keys(obj);
    return keys.some((key) => key.startsWith("$"));
  }
  return false;
};

// Email normalization
const normalizeEmail = (email) => {
  if (!isEmail(email)) return null;
  return email.toLowerCase().trim();
};

// Validate and sanitize name
const isValidName = (name) => {
  if (typeof name !== "string") return false;
  // Allow letters, spaces, hyphens, apostrophes
  const namePattern = /^[a-zA-Z\s'-]{1,50}$/;
  return namePattern.test(name.trim());
};

module.exports = {
  isEmail,
  minLen,
  isStrongPassword,
  sanitizeHtml,
  hasSqlInjection,
  hasNoSqlInjection,
  normalizeEmail,
  isValidName,
};
