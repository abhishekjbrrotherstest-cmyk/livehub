import rateLimit from 'express-rate-limit';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 50,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({ success: false, message: 'Too many authentication attempts. Try again later.' });
  }
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler(_req, res) {
    res.status(429).json({ success: false, message: 'Too many requests. Slow down.' });
  }
});
