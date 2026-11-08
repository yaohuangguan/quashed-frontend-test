// A masked text input with an icon button that opens the browser's native
// date or month picker. Typing works everywhere; the picker is a shortcut
// where the browser supports it.
import { useRef } from "react";
import { describedBy } from "./Field.tsx";
import { calendarIcon } from "./icons.ts";
import { TextInput } from "./TextInput.tsx";

type PickerInputProps = {
  id: string;
  kind: "date" | "month";
  value: string;
  placeholder: string;
  pickerLabel: string;
  autoComplete?: string;
  /** Earliest value for the native picker, as YYYY-MM-DD or YYYY-MM. */
  min?: string;
  error?: string;
  mask: (typed: string) => string;
  /** Converts the native picker's value to the masked text. */
  fromPicker: (pickerValue: string) => string;
  onChange: (masked: string) => void;
  onBlur?: () => void;
};

export function PickerInput(props: PickerInputProps) {
  const pickerRef = useRef<HTMLInputElement>(null);
  const textRef = useRef<HTMLInputElement>(null);

  function openPicker() {
    const picker = pickerRef.current;
    try {
      picker?.showPicker();
    } catch {
      // Not supported for this input type in this browser: let the user type.
      textRef.current?.focus();
    }
  }

  return (
    <div className="picker-input">
      <TextInput
        ref={textRef}
        id={props.id}
        inputMode="numeric"
        autoComplete={props.autoComplete ?? "off"}
        placeholder={props.placeholder}
        value={props.value}
        onChange={(e) => props.onChange(props.mask(e.target.value))}
        onBlur={props.onBlur}
        {...describedBy(props.id, props.error)}
      />
      <button type="button" className="picker-input__button" onClick={openPicker} aria-label={props.pickerLabel}>
        <img src={calendarIcon} alt="" width={20} height={20} />
      </button>
      <input
        ref={pickerRef}
        type={props.kind}
        className="picker-input__native"
        tabIndex={-1}
        aria-hidden="true"
        min={props.min}
        onChange={(e) => {
          if (e.target.value) {
            props.onChange(props.fromPicker(e.target.value));
            props.onBlur?.();
          }
        }}
      />
    </div>
  );
}
