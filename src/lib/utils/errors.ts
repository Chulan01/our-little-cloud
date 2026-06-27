import { ZodError } from "zod";

export type ActionErrorCode = "UNAUTHORIZED" | "VALIDATION" | "NOT_FOUND" | "FORBIDDEN" | "SERVER";

export type ActionError = {
  code: ActionErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export type Result<T> = { ok: true; data: T } | { ok: false; error: ActionError };

export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

export function fail(code: ActionErrorCode, message: string, fieldErrors?: Record<string, string[]>): Result<never> {
  return { ok: false, error: { code, message, fieldErrors } };
}

export function validationError(error: ZodError): Result<never> {
  const fieldErrors = Object.fromEntries(
    Object.entries(error.flatten().fieldErrors).filter((entry): entry is [string, string[]] => Array.isArray(entry[1]))
  );
  return fail("VALIDATION", "Проверь поля и попробуй еще раз.", fieldErrors);
}

export function logServerError(scope: string, error: unknown): void {
  console.error(`[${scope}]`, error);
}
