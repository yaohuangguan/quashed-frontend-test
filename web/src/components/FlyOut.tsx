// The panel that slides in from the right, over a blurred page.
import { useEffect, useRef, type ReactNode } from "react";
import { useDialog } from "./use-dialog.ts";

type FlyOutProps = {
  labelledBy?: string;
  label?: string;
  /** When this changes, focus moves to the panel, so keyboard users are not left on a removed button. */
  stepKey?: string;
  onClose: () => void;
  children: ReactNode;
};

export function FlyOut({ labelledBy, label, stepKey, onClose, children }: FlyOutProps) {
  const ref = useRef<HTMLElement>(null);
  useDialog(ref, onClose);
  const firstStep = useRef(true);
  useEffect(() => {
    if (firstStep.current) {
      firstStep.current = false;
      return;
    }
    ref.current?.focus();
    ref.current?.scrollTo({ top: 0 });
  }, [stepKey]);
  return (
    <div className="flyout-layer">
      <div className="overlay" data-testid="flyout-overlay" onClick={onClose} />
      <section
        ref={ref}
        className="flyout"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : label}
        tabIndex={-1}
      >
        {children}
      </section>
    </div>
  );
}
