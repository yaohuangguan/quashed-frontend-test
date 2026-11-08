// Runs a shared schema on every render and reports the first error per field.
// Errors only show for fields the user has left (touched), so an empty form
// does not start out covered in red.
import { useCallback, useState } from "react";
import type { z } from "zod";

export function useValidation<T extends z.ZodType>(schema: T, candidate: unknown) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());
  const result = schema.safeParse(candidate);

  const errors: Record<string, string> = {};
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = String(issue.path[0] ?? "");
      errors[field] ??= issue.message;
    }
  }

  const touch = useCallback((field: string) => {
    setTouched((current) => (current.has(field) ? current : new Set(current).add(field)));
  }, []);

  return {
    data: result.success ? (result.data as z.infer<T>) : null,
    errorFor: (field: string) => (touched.has(field) ? errors[field] : undefined),
    touch,
  };
}
