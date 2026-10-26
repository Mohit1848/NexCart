/**
 * Error Handling Middleware
 */

// Handle 404 - Not Found
export const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      message: `Resource not found: ${req.method} ${req.originalUrl}`,
      statusCode: 404
    }
  });
};

// Global Error Handler
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error(`[Error] ${err.message}`, err.stack);

  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      statusCode,
      // Stack traces must never leak to production clients
      ...(isDevelopment && { stack: err.stack })
    }
  });
};
