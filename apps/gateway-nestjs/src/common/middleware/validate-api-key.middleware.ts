import { Request, Response, NextFunction } from 'express';
import { Logger } from '@nestjs/common';

const logger = new Logger('ValidateApiKeyMiddleware');

/**
 * Simple middleware (function form) to validate `x-api-key` on incoming HTTP requests.
 * - Reads expected key from process.env.GATEWAY_API_KEY
 * - Returns 401 if missing/invalid
 *
 * Notes:
 * - This is an example for Gateway developers. Adapt path selection when registering.
 * - For stricter security use ConfigService + secrets manager and consider mTLS/IP allowlist.
 */
export function validateApiKeyMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const expected = process.env.GATEWAY_API_KEY || 'dev-secret';
    const got = req.header('x-api-key') || req.header('X-API-KEY');
    if (!got) {
      logger.warn(`Missing x-api-key from ${req.ip} ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ error: 'missing x-api-key' });
    }
    if (got !== expected) {
      logger.warn(`Invalid x-api-key from ${req.ip} ${req.method} ${req.originalUrl}`);
      return res.status(401).json({ error: 'invalid x-api-key' });
    }
    // pass-through
    return next();
  } catch (err: any) {
    logger.error('validateApiKeyMiddleware error: ' + err?.message);
    return res.status(500).json({ error: 'internal' });
  }
}
