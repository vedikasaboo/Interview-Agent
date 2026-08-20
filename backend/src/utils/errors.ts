// Every error the API throws deliberately is an AppError subclass. The central
// error middleware maps `statusCode`/`code` to the response; `code` is the
// stable machine string the frontend switches on (never the message).
export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly code: string;
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = new.target.name;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  readonly statusCode = 400;
  readonly code = "VALIDATION_ERROR";
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly code = "UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly code = "FORBIDDEN";
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly code = "NOT_FOUND";
}

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly code = "CONFLICT";
}

// The request was well-formed but couldn't be processed — e.g. a valid PDF that
// yields no text, or an LLM response that fails the resume schema.
export class UnprocessableEntityError extends AppError {
  readonly statusCode = 422;
  readonly code = "UNPROCESSABLE";
}
