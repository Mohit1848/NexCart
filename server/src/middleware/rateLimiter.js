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

/**
 * Rate Limiter for AI Shopping Assistant Endpoints
 * Protects against prompt injection flooding, DoS, and LLM API cost depletion
 */
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 30, // 30 requests per minute in production
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many AI Assistant requests. Please wait a moment before sending another query.',
      statusCode: 429
    }
  }
});

export default {
  authRateLimiter,
  aiRateLimiter
};
