"use client";

import { useState, useEffect, useRef } from "react";
import type { CityItem } from "@/types/auth";

export interface CityValue {
  id: number;
  label: string;
}

interface Props {
  value: CityValue | null;
  onChange: (city: CityValue | null) => void;
  disabled?: boolean;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-gray-300 px-3 py-2 pr-7 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400";

export default function CitySelector({ value, onChange, disabled }: Props) {
  const [inputValue, setInputValue] = useState(value?.label ?? "");
  const [prevValue, setPrevValue] = useState(value);
  const [results, setResults] = useState<CityItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Sync input text when the confirmed city changes externally (e.g. org detail loads).
  // Using render-time state adjustment to avoid useEffect + setState cascading renders.
  if (prevValue !== value) {
    setPrevValue(value);
    setInputValue(value?.label ?? "");
  }

  useEffect(() => {
    return () => clearTimeout(searchTimer.current);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setInputValue(q);
    onChange(null); // clear confirmed selection while typing

    clearTimeout(searchTimer.current);
    if (!q.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/cities?q=${encodeURIComponent(q)}&limit=20`
        );
        if (res.ok) {
          const data: CityItem[] = await res.json();
          setResults(Array.isArray(data) ? data : []);
          setIsOpen(true);
        }
      } catch {
        // city search failure is non-blocking
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }

  function handleSelect(city: CityItem) {
    const cityValue: CityValue = { id: city.id, label: city.name_en };
    setInputValue(city.name_en);
    setIsOpen(false);
    setResults([]);
    onChange(cityValue);
  }

  function handleClear() {
    setInputValue("");
    setResults([]);
    setIsOpen(false);
    onChange(null);
  }

  function handleBlur() {
    // Only fires when focus leaves to outside the component.
    // onMouseDown with e.preventDefault() on dropdown items prevents this
    // from firing when the user clicks a result.
    setIsOpen(false);
    setInputValue(value?.label ?? "");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setIsOpen(false);
      setInputValue(value?.label ?? "");
      e.currentTarget.blur();
    }
    if (e.key === "Enter" && isOpen && results.length > 0) {
      e.preventDefault();
      handleSelect(results[0]);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={inputValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder="Search for a city…"
        className={INPUT_CLASS}
        autoComplete="off"
      />
      {isLoading && (
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400">
          …
        </span>
      )}
      {value && !isLoading && !disabled && (
        <button
          type="button"
          aria-label="Clear city"
          onMouseDown={(e) => {
            e.preventDefault(); // keep input focused, prevent blur
            handleClear();
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-base leading-none text-gray-400 hover:text-gray-600"
        >
          ×
        </button>
      )}
      {isOpen && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {results.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-gray-50"
                onMouseDown={(e) => e.preventDefault()} // prevent input blur
                onClick={() => handleSelect(city)}
              >
                <div className="text-sm text-gray-900">{city.name_en}</div>
                {city.name_he && (
                  <div className="text-xs text-gray-400" dir="rtl">
                    {city.name_he}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
