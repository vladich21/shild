"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CATEGORY_GROUPS } from "@/lib/catalog";

export function CategoryField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const fieldId = useId();
  const query = value.trim().toLowerCase();
  const groups = CATEGORY_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => item.toLowerCase().includes(query)),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    function onPointer(event: PointerEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="field category-field" ref={box}>
      <span id={`${fieldId}-label`}>Категория</span>
      <input
        id={fieldId}
        aria-labelledby={`${fieldId}-label`}
        aria-expanded={open}
        aria-controls={`${fieldId}-menu`}
        role="combobox"
        value={value}
        placeholder="Например, холодильник"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
      />
      {open ? (
        <div className="category-menu" id={`${fieldId}-menu`} role="listbox">
          {groups.length === 0 ? (
            <p className="category-empty">В списке нет. Останется ваше название.</p>
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <p>{group.label}</p>
                {group.items.map((item) => (
                  <button
                    key={item}
                    type="button"
                    role="option"
                    aria-selected={item === value}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      onChange(item);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
