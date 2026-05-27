'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface SearchableOption {
  value: string;
  label: string;
  helper?: string;
  searchText?: string;
}

interface Props {
  value: string;
  options: SearchableOption[];
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  required?: boolean;
}

export default function SearchableSelect({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = 'Select',
  searchPlaceholder = 'Search…',
  className = '',
  required,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? options[0],
    [options, value],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => {
      const haystack = `${option.label} ${option.helper ?? ''} ${option.value} ${
        option.searchText ?? ''
      }`.toLowerCase();
      return haystack.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`search-select ${className}`.trim()} data-open={open}>
      <button
        type="button"
        className="search-select-trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-required={required || undefined}
        onClick={() => setOpen((next) => !next)}
      >
        <span>{selected?.label ?? placeholder}</span>
        {selected?.helper && <small>{selected.helper}</small>}
      </button>

      {open && (
        <div className="search-select-panel">
          <input
            ref={inputRef}
            className="search-select-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <div className="search-select-list" role="listbox" aria-label={ariaLabel}>
            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`search-select-option ${option.value === value ? 'on' : ''}`}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => choose(option.value)}
                >
                  <span>{option.label}</span>
                  {option.helper && <small>{option.helper}</small>}
                </button>
              ))
            ) : (
              <p className="search-select-empty">No results found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
