import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

/**
 * Express middleware that validates req.body against the given Zod schema.
 * Returns 400 with structured field errors on failure.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Request body failed validation',
        details: result.error.flatten().fieldErrors,
      })
      return
    }
    req.body = result.data
    next()
  }
}

/**
 * Validates req.query against the given Zod schema.
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'Query parameters failed validation',
        details: result.error.flatten().fieldErrors,
      })
      return
    }
    // Attach parsed query so downstream sees coerced types
    ;(req as Request & { parsedQuery: unknown }).parsedQuery = result.data
    next()
  }
}
