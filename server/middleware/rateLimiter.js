import rateLimit from 'express-rate-limit';

export const checkRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 120, // limit each IP to 120 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many grammar check requests from this IP, please try again in a few minutes.'
  }
});
