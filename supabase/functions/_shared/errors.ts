// Every error the API can return. The API maps each code to an HTTP status;
// the web app maps each code to a message.

export const ERROR_STATUS = {
  VALIDATION_FAILED: 400,
  INVALID_API_KEY: 401,
  NOT_FOUND: 404,
  PROVIDER_NOT_FOUND: 404,
  CONNECTION_NOT_FOUND: 404,
  ORDER_NOT_FOUND: 404,
  METHOD_NOT_ALLOWED: 405,
  CONNECTION_CLOSED: 409,
  ORDER_ALREADY_EXISTS: 409,
  FEEDBACK_ALREADY_SENT: 409,
  PAYLOAD_TOO_LARGE: 413,
  INTERNAL: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

/** Body of every error response. */
export type ErrorBody = {
  error: {
    code: ErrorCode;
    /** Field paths and messages, only for VALIDATION_FAILED. */
    fields?: { path: string; message: string }[];
  };
};
