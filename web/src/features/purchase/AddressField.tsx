// Address input with suggestions from the API (combobox pattern). Free text is
// allowed; a suggestion just fills it in.
import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { describedBy } from "../../components/Field.tsx";
import { TextInput } from "../../components/TextInput.tsx";
import { api } from "../../lib/api-client.ts";

const DEBOUNCE_MS = 200;
const MIN_QUERY = 2;

type AddressFieldProps = {
  id: string;
  value: string;
  placeholder: string;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
};

export function AddressField({ id, value, placeholder, error, onChange, onBlur }: AddressFieldProps) {
  const listId = useId();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (query.trim().length < MIN_QUERY) {
      setSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      api
        .searchAddresses(query.trim(), controller.signal)
        .then((found) => {
          setSuggestions(found);
          setActive(-1);
        })
        // Suggestions are optional; typing still works without them.
        .catch(() => setSuggestions([]));
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const visible = open && suggestions.length > 0;

  function choose(address: string) {
    onChange(address);
    setOpen(false);
    setSuggestions([]);
  }

  function onKeyDown(event: KeyboardEvent) {
    if (!visible) return;
    if (event.key === "ArrowDown") setActive((i) => Math.min(suggestions.length - 1, i + 1));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(0, i - 1));
    else if (event.key === "Enter" && active >= 0) choose(suggestions[active]!);
    else if (event.key === "Escape") setOpen(false);
    else return;
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="combobox">
      <TextInput
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={visible}
        aria-controls={listId}
        aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          setOpen(false);
          onBlur();
        }}
        {...describedBy(id, error)}
      />
      <ul id={listId} className="menu" role="listbox" hidden={!visible}>
        {suggestions.map((address, index) => (
          <li
            key={address}
            id={`${listId}-${index}`}
            role="option"
            aria-selected={index === active}
            className={`menu__item${index === active ? " menu__item--active" : ""}`}
            // Keep focus in the input so blur does not close the list first.
            onMouseDown={(e) => e.preventDefault()}
            onPointerEnter={() => setActive(index)}
            onClick={() => choose(address)}
          >
            {address}
          </li>
        ))}
      </ul>
    </div>
  );
}
