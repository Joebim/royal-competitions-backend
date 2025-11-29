import rateLimit from 'express-rate-limit';

// General API rate limiter with short wait time
export const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again in a moment.',
    retryAfter: 60, // seconds
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false, // Count failed requests too
});

// Stricter limit for authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per 15 minutes
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    retryAfter: 900, // 15 minutes in seconds
  },
  standardHeaders: true,
  legacyHeaders: false,
});




