import type { ButtonHTMLAttributes } from "react";
import { arrowRightLight, arrowRightMuted } from "./icons.ts";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "text";
  /** "large" is the 48px "Get Started" button; "medium" is 40px. */
  size?: "medium" | "large";
  withArrow?: boolean;
  /** A left-pointing arrow before the label, for "Back". */
  backArrow?: boolean;
};

export function Button({
  variant = "primary",
  size = "medium",
  withArrow = false,
  backArrow = false,
  className = "",
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const arrow = rest.disabled ? arrowRightMuted : arrowRightLight;
  return (
    <button type={type} className={`button button--${variant} button--${size} ${className}`} {...rest}>
      {backArrow && <img className="button__arrow button__arrow--back" src={arrowRightMuted} alt="" aria-hidden="true" />}
      <span className="button__label">{children}</span>
      {withArrow && <img className={`button__arrow button__arrow--${size}`} src={arrow} alt="" aria-hidden="true" />}
    </button>
  );
}
