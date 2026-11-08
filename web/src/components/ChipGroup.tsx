// A row of pill buttons. "single" behaves like radio buttons, "multi" like
// checkboxes.
type ChipGroupProps = {
  labelId: string;
  options: readonly string[];
  mode: "single" | "multi";
  selected: readonly string[];
  onChange: (selected: string[]) => void;
  /** Wider pills, used for Yes / No. */
  wide?: boolean;
  /** Visible text for each option; defaults to the option value. */
  optionLabel?: (option: string) => string;
  onBlur?: () => void;
};

export function ChipGroup({ labelId, options, mode, selected, onChange, wide, optionLabel, onBlur }: ChipGroupProps) {
  function toggle(option: string) {
    if (mode === "single") onChange([option]);
    else onChange(selected.includes(option) ? selected.filter((s) => s !== option) : [...selected, option]);
  }

  return (
    <div
      className="chip-group"
      role={mode === "single" ? "radiogroup" : "group"}
      aria-labelledby={labelId}
      // Counts as "left the field" only when focus leaves the whole group.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) onBlur?.();
      }}
    >
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            className={`chip${isSelected ? " chip--selected" : ""}${wide ? " chip--wide" : ""}`}
            role={mode === "single" ? "radio" : undefined}
            aria-checked={mode === "single" ? isSelected : undefined}
            aria-pressed={mode === "multi" ? isSelected : undefined}
            onClick={() => toggle(option)}
          >
            {optionLabel ? optionLabel(option) : option}
          </button>
        );
      })}
    </div>
  );
}
