const { NODE_ENV } = require("../config/env");

// Centralized error handler
const errorHandler = (err, req, res, next) => {
  // Log error with request ID
  console.error({
    timestamp: new Date().toISOString(),
    requestId: req.id || "unknown",
    error: {
      message: err.message,
      stack: NODE_ENV === "development" ? err.stack : undefined,
      code: err.code,
      statusCode: err.statusCode || 500,
    },
    request: {
      method: req.method,
      path: req.path,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    },
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Generic error response (don't leak internal details)
  const errorResponse = {
    error: NODE_ENV === "production" ? "An error occurred" : err.message,
    requestId: req.id,
  };

  // Add stack trace in development
  if (NODE_ENV === "development") {
    errorResponse.stack = err.stack;
  }

  res.status(statusCode).json(errorResponse);
};

// 404 handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    error: "Not found",
    path: req.path,
  });
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
