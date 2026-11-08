import type { ReactNode } from "react";

/** The row of buttons pinned to the bottom of the fly-out or popup. */
export function ButtonsPane({ start, children }: { start?: ReactNode; children: ReactNode }) {
  return (
    <div className="buttons-pane">
      {start && <div className="buttons-pane__start">{start}</div>}
      {children}
    </div>
  );
}
