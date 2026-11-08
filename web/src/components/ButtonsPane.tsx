import type { ReactNode } from "react";

/** The row of buttons pinned to the bottom of the fly-out or popup. */
export function ButtonsPane({ children }: { children: ReactNode }) {
  return <div className="buttons-pane">{children}</div>;
}
