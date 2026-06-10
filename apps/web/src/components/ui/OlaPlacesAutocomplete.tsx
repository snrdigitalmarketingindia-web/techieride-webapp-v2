'use client';

/**
 * OlaPlacesAutocomplete
 *
 * A drop-in replacement for a plain <input> that adds Ola Maps address
 * autocomplete. When the user selects a prediction, the Ola Maps Place Details
 * API is called to resolve the lat/lng, and onSelect is fired with the address
 * string plus optional coordinates.
 *
 * Usage:
 *   <OlaPlacesAutocomplete
 *     value={origin}
 *     onChange={setOrigin}
 *     onSelect={(address, lat, lng) => { ... }}
 *     placeholder="Search for a location"
 *     className="..."
 *   />
 */

import { useState, useRef, useCallback } from 'react';
import { autocomplete, placeDetails, type OlaPrediction } from '@/lib/olamaps';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Called when user picks a suggestion. lat/lng are undefined if Place Details fails. */
  onSelect: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
}

export default function OlaPlacesAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  className,
  disabled,
  id,
  name,
}: Props) {
  const [predictions, setPredictions] = useState<OlaPrediction[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchPredictions = useCallback(async (input: string) => {
    setLoading(true);
    const preds = await autocomplete(input);
    setPredictions(preds);
    setOpen(preds.length > 0);
    setLoading(false);
  }, []);

  const handleInput = (val: string) => {
    onChange(val);
    clearTimeout(debounceRef.current);
    if (val.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = setTimeout(() => fetchPredictions(val), 350);
  };

  const handleSelect = async (pred: OlaPrediction) => {
    onChange(pred.description);
    setOpen(false);
    setPredictions([]);

    // Resolve coordinates via Place Details
    const loc = await placeDetails(pred.place_id);
    onSelect(pred.description, loc?.lat, loc?.lng);
  };

  const handleBlur = () => {
    // Delay so onMouseDown on a list item fires before the list disappears
    setTimeout(() => setOpen(false), 200);
  };

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type="text"
        value={value}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={handleBlur}
        onFocus={() => predictions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={className}
      />

      {/* Loading spinner inside the input */}
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Dropdown */}
      {open && predictions.length > 0 && (
        <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {predictions.map((pred) => (
            <li key={pred.place_id}>
              <button
                type="button"
                onMouseDown={() => handleSelect(pred)}
                className="w-full text-left px-4 py-3 hover:bg-brand-50 text-sm text-gray-800 border-b border-gray-100 last:border-0 transition-colors"
              >
                <span className="text-gray-400 mr-2 text-xs">📍</span>
                <span className="font-medium">
                  {pred.structured_formatting?.main_text ?? pred.description}
                </span>
                {pred.structured_formatting?.secondary_text && (
                  <span className="text-gray-400 text-xs ml-1">
                    · {pred.structured_formatting.secondary_text}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
