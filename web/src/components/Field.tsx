import type { ReactNode } from "react";

type FieldProps = {
  id: string;
  label: string;
  /** Shown under the control once the field was touched. */
  error?: string;
  /** For groups that are not a single input, the label is not a <label>. */
  asGroup?: boolean;
  className?: string;
  children: ReactNode;
};

/** Label, control and error message, laid out as in the design. */
export function Field({ id, label, error, asGroup, className = "", children }: FieldProps) {
  return (
    <div className={`field ${className}`}>
      {asGroup ? (
        <span className="field__label" id={`${id}-label`}>
          {label}
        </span>
      ) : (
        <label className="field__label" id={`${id}-label`} htmlFor={id}>
          {label}
        </label>
      )}
      <div className="field__control">{children}</div>
      {error && (
        <p className="field__error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

/** Props that link an input to its Field's error message. */
export function describedBy(id: string, error?: string) {
  return error ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};
}
