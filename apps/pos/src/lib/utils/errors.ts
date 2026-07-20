export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

interface ErrorEnvelope {
  success: false
  message: string
  code?: string
  details?: unknown
}

export function toErrorResponse(error: unknown): { status: number; body: ErrorEnvelope } {
  if (error instanceof ApiError) {
    return {
      status: error.statusCode,
      body: {
        success: false,
        message: error.message,
        code: error.code,
      },
    }
  }

  // Log unexpected errors in development
  if (process.env.NODE_ENV === "development") {
    console.error('Unexpected error:', error)
  }

  return {
    status: 500,
    body: {
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  }
}

// Common error codes
export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const
