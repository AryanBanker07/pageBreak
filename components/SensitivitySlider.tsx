'use client';

import React from 'react';

interface SensitivitySliderProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

/**
 * Labeled range slider controlling the minimum whitespace height (in px)
 * required to qualify as a "safe" page break zone.
 *
 * Lower = more aggressive (breaks on tiny gaps).
 * Higher = more conservative (needs larger whitespace).
 */
export default function SensitivitySlider({
  value,
  onChange,
  disabled = false,
}: SensitivitySliderProps) {
  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <div className="flex items-center justify-between mb-2">
        <label
          htmlFor="sensitivity-slider"
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Sensitivity
        </label>
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            fontFamily: 'var(--font-mono)',
            backgroundColor: 'var(--color-surface-alt)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text-primary)',
          }}
        >
          {value}px
        </span>
      </div>
      <input
        id="sensitivity-slider"
        type="range"
        min={4}
        max={80}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        className="w-full"
      />
      <div
        className="flex justify-between mt-1 text-[10px]"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        <span>Aggressive</span>
        <span>Conservative</span>
      </div>
    </div>
  );
}
