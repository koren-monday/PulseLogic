import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './errorHandler.js';

/**
 * Express middleware factory for Zod schema validation.
 * Validates request body against the provided schema.
 */
export function validate<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      const result = schema.safeParse(req.body);
      if (!result.success) {
        const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        throw new AppError(400, `Validation failed: ${errors.join(', ')}`);
      }
      req.body = result.data;
      next();
    } catch (error) {
      next(error);
    }
  };
}
