// Shared behaviour for the fly-out and the popup: move focus in, keep Tab
// inside, close on Escape, stop the page behind from scrolling, and give focus
// back when the dialog closes.
import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
let openDialogs = 0;

export function useDialog(ref: RefObject<HTMLElement | null>, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    openDialogs += 1;
    document.body.classList.add("has-dialog");
    ref.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      const root = ref.current;
      if (!root) return;
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
      } else if (event.key === "Tab") {
        const items = [...root.querySelectorAll<HTMLElement>(FOCUSABLE)];
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openDialogs -= 1;
      if (openDialogs === 0) document.body.classList.remove("has-dialog");
      if (previous?.isConnected) previous.focus();
    };
  }, [ref]);
}
