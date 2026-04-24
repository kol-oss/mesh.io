import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type StyledSelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type StyledSelectProps = {
  value: string;
  options: StyledSelectOption[];
  placeholder?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  allowEmpty?: boolean;
};

export default function StyledSelect({
  value,
  options,
  placeholder = "Select",
  onChange,
  disabled = false,
  allowEmpty = true,
}: StyledSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value],
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current || rootRef.current.contains(event.target as Node)) {
        return;
      }
      setIsOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="properties-select" ref={rootRef}>
      <button
        className={`properties-select__trigger ${selectedOption ? "" : "properties-select__trigger--placeholder"}`}
        type="button"
        onClick={() => {
          if (disabled) {
            return;
          }
          setIsOpen((prev) => !prev);
        }}
        disabled={disabled}
        aria-expanded={isOpen}
      >
        <span className="properties-select__value">
          {selectedOption?.icon && (
            <span className="properties-select__icon">{selectedOption.icon}</span>
          )}
          <span>{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown
          size={12}
          className={`properties-select__chevron ${isOpen ? "properties-select__chevron--open" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="properties-select__menu" role="listbox">
          {[...(allowEmpty ? [{ value: "", label: placeholder }] : []), ...options].map(
            (option) => {
              const isSelected = option.value === value;
              return (
                <button
                  className={`properties-select__option ${isSelected ? "properties-select__option--selected" : ""}`}
                  key={`option-${option.value || "empty"}`}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  <span className="properties-select__value">
                    {option.icon && <span className="properties-select__icon">{option.icon}</span>}
                    <span>{option.label}</span>
                  </span>
                </button>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
