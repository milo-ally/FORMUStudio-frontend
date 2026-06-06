import { useState, useRef, useEffect, useCallback } from "react";
import "./Select.css";

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[] | string[];
  onChange: (value: string) => void;
  className?: string;
}

export function Select({ value, options, onChange, className = "" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const items: SelectOption[] = typeof options[0] === "string"
    ? (options as string[]).map((v) => ({ value: v, label: v }))
    : (options as SelectOption[]);

  const current = items.find((o) => o.value === value);
  const label = current?.label ?? value;

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [open]);

  // 关闭时 ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) {
      document.addEventListener("keydown", handler);
      return () => document.removeEventListener("keydown", handler);
    }
  }, [open]);

  const select = useCallback(
    (v: string) => {
      onChange(v);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div className={`custom-select ${className}`} ref={ref}>
      <button
        type="button"
        className={`custom-select-trigger ${open ? "open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        <span>{label}</span>
        <svg className={`chevron ${open ? "up" : ""}`} width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="custom-select-dropdown">
          {items.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`custom-select-option ${opt.value === value ? "selected" : ""}`}
              onClick={() => select(opt.value)}
            >
              {opt.label}
              {opt.value === value && (
                <svg className="check" width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7.5L6 10.5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
