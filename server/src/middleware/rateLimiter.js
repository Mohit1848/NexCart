import rateLimit from 'express-rate-limit';

/**
 * Rate Limiter for Authentication Endpoints (Login / Register)
 * Prevents automated brute-force attacks and credential stuffing
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 20, // 20 attempts per window per IP in dev/prod
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
      statusCode: 429
    }
  }
});

export default {
  authRateLimiter
};