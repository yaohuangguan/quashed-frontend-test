// The panel that slides in from the right, over a blurred page.
import { useRef, type ReactNode } from "react";
import { useDialog } from "./use-dialog.ts";

type FlyOutProps = {
  labelledBy?: string;
  label?: string;
  onClose: () => void;
  children: ReactNode;
};

export function FlyOut({ labelledBy, label, onClose, children }: FlyOutProps) {
  const ref = useRef<HTMLElement>(null);
  useDialog(ref, onClose);
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
