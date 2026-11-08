// A dropdown styled like the design's "Select" field: a button that opens a
// listbox. Keyboard: arrows move, Enter or Space picks, Escape closes.
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { describedBy } from "./Field.tsx";
import { caretDownIcon } from "./icons.ts";

type SelectFieldProps = {
  id: string;
  labelId: string;
  options: readonly string[];
  value: string | undefined;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
};

export function SelectField({ id, labelId, options, value, placeholder, error, onChange, onBlur }: SelectFieldProps) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function show() {
    setActive(Math.max(0, value ? options.indexOf(value) : 0));
    setOpen(true);
  }

  function choose(option: string) {
    onChange(option);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onListKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown") setActive((i) => Math.min(options.length - 1, i + 1));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (event.key === "Home") setActive(0);
    else if (event.key === "End") setActive(options.length - 1);
    else if (event.key === "Enter" || event.key === " ") choose(options[active]!);
    else if (event.key === "Escape" || event.key === "Tab") {
      setOpen(false);
      if (event.key === "Escape") buttonRef.current?.focus();
    } else return;
    // Escape must not also close the fly-out.
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      className="select"
      ref={rootRef}
      // Counts as "left the field" only when focus leaves the button and list.
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node | null)) onBlur?.();
      }}
    >
      <button
        ref={buttonRef}
        id={id}
        type="button"
        className={`select__button${value ? "" : " select__button--placeholder"}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${labelId} ${id}`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        {...describedBy(id, error)}
      >
        {value ?? placeholder}
        <img className="select__caret" src={caretDownIcon} alt="" width={20} height={20} />
      </button>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          className="menu"
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKeyDown}
        >
          {options.map((option, index) => (
            <li
              key={option}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={option === value}
              className={`menu__item${index === active ? " menu__item--active" : ""}`}
              onPointerEnter={() => setActive(index)}
              onClick={() => choose(option)}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
