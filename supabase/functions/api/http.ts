// Request and response helpers for the API. Runtime-neutral: uses only the
// standard fetch types, so the same code runs on Deno and in Node tests.
import { z } from "zod";
import { ERROR_STATUS, type ErrorBody, type ErrorCode } from "../_shared/errors.ts";
import { toFieldErrors } from "../_shared/purchase.ts";

/** Largest JSON body the API accepts, in bytes. */
export const MAX_BODY_BYTES = 16 * 1024;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly fields?: { path: string; message: string }[];

  constructor(code: ErrorCode, fields?: { path: string; message: string }[]) {
    super(code);
    this.code = code;
    this.fields = fields;
  }
}

export const CORS_HEADERS: Record<string, string> = {
  // The API is public and uses no cookies, so any origin may call it.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

export function noContent(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function errorResponse(error: AppError): Response {
  const body: ErrorBody = { error: { code: error.code } };
  if (error.fields) body.error.fields = error.fields;
  return json(body, ERROR_STATUS[error.code]);
}

/** Reads a JSON body of at most MAX_BODY_BYTES. */
export async function readJson(req: Request): Promise<unknown> {
  const text = await req.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) {
    throw new AppError("PAYLOAD_TOO_LARGE");
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new AppError("VALIDATION_FAILED", [{ path: "", message: "Body must be JSON" }]);
  }
}

/** Parses input with a schema, or throws VALIDATION_FAILED with field errors. */
export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown, prefix = ""): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;
  const fields = toFieldErrors(result.error).map((f) => ({
    path: prefix && f.path ? `${prefix}.${f.path}` : prefix || f.path,
    message: f.message,
  }));
  throw new AppError("VALIDATION_FAILED", fields);
}
