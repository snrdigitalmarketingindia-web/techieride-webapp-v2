'use client';

/**
 * LocationInput — text input with smart label suggestions (maps-off model).
 *
 * Locations are static display labels, not geo points. Suggestions come from:
 *   1. ⭐ the user's Saved Locations (cached in the auth store)
 *   2. 🏠/🏢 profile Home & Office labels
 * matched with the same normalize-then-substring fuzzy used by ride search,
 * so typing "roh" suggests "Rohini Marbles" and "hite" suggests "Hitech City".
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuthStore } from '@/store/auth.store';

const norm = (v: string | null | undefined) =>
  (v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

interface Suggestion {
  label: string;
  icon: string;
}

interface LocationInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

export function LocationInput({ value, onChange, placeholder, className, maxLength = 80 }: LocationInputProps) {
  const { user, savedLocations, savedLocationsLoaded, fetchSavedLocations, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthenticated && !savedLocationsLoaded) fetchSavedLocations();
  }, [isAuthenticated, savedLocationsLoaded]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pool: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = [];
    const seen = new Set<string>();
    const add = (label: string | null | undefined, icon: string) => {
      const l = (label ?? '').trim();
      if (!l || seen.has(norm(l))) return;
      seen.add(norm(l));
      out.push({ label: l, icon });
    };
    add((user as any)?.homeLocation || (user as any)?.homeAddress, '🏠');
    add((user as any)?.officeLocation || (user as any)?.officeAddress, '🏢');
    for (const loc of savedLocations) add(loc.alias, loc.isFavorite ? '⭐' : '📍');
    return out;
  }, [user, savedLocations]);

  const matches = useMemo(() => {
    const q = norm(value);
    if (!q) return pool.slice(0, 6); // empty input → show the user's places
    return pool
      .filter((s) => {
        const n = norm(s.label);
        return n.includes(q) || q.includes(n);
      })
      .slice(0, 6);
  }, [value, pool]);

  // Hide the dropdown when the input exactly equals a suggestion (just picked)
  const exact = matches.length === 1 && norm(matches[0].label) === norm(value);
  const show = open && matches.length > 0 && !exact;

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        maxLength={maxLength}
        className={className}
      />
      {show && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
          {matches.map((s) => (
            <button
              key={s.label}
              type="button"
              onMouseDown={(e) => e.preventDefault() /* keep input focus */}
              onClick={() => { onChange(s.label); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-brand-50 transition"
            >
              <span className="shrink-0">{s.icon}</span>
              <span className="text-gray-800 truncate">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
