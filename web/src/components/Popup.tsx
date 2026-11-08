// A centred dialog over the whole page, used for feedback.
import { useRef, type ReactNode } from "react";
import { closeIcon } from "./icons.ts";
import { useDialog } from "./use-dialog.ts";

type PopupProps = {
  labelledBy: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
};

export function Popup({ labelledBy, closeLabel, onClose, children }: PopupProps) {
  const ref = useRef<HTMLElement>(null);
  useDialog(ref, onClose);
  return (
    <div className="popup-layer">
      <div className="overlay overlay--full" />
      <section ref={ref} className="popup" role="dialog" aria-modal="true" aria-labelledby={labelledBy} tabIndex={-1}>
        {children}
        <button type="button" className="icon-button popup__close" onClick={onClose} aria-label={closeLabel}>
          <img src={closeIcon} alt="" width={20} height={20} />
        </button>
      </section>
    </div>
  );
}
