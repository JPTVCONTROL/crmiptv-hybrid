export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, 'NOT_FOUND');
  }
}

export class AuthError extends AppError {
  constructor(message: string, statusCode: 401 | 403 = 401) {
    super(message, statusCode, 'AUTH_ERROR');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Muitas tentativas. Tente novamente em alguns minutos.') {
    super(message, 429, 'RATE_LIMIT');
  }
}
