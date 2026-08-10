'use client';

import React from 'react';
import type { PageSize } from '@/lib/types';

interface PageSizeToggleProps {
  value: PageSize;
  onChange: (size: PageSize) => void;
  disabled?: boolean;
}

/**
 * Toggle between A4 and US Letter page sizes.
 * Compact segmented control with monochrome styling.
 */
export default function PageSizeToggle({
  value,
  onChange,
  disabled = false,
}: PageSizeToggleProps) {
  const options: { key: PageSize; label: string; sub: string }[] = [
    { key: 'A4', label: 'A4', sub: '210×297mm' },
    { key: 'LETTER', label: 'Letter', sub: '8.5×11 in' },
  ];

  return (
    <div className={disabled ? 'opacity-40' : ''}>
      <label
        className="block text-xs font-medium uppercase tracking-wide mb-2"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Page Size
      </label>
      <div
        className="flex rounded overflow-hidden"
        style={{ border: '1px solid var(--color-border)' }}
        role="radiogroup"
      >
        {options.map((opt) => {
          const isActive = value === opt.key;
          return (
            <button
              key={opt.key}
              role="radio"
              aria-checked={isActive}
              onClick={() => !disabled && onChange(opt.key)}
              disabled={disabled}
              className="flex-1 py-2 px-3 text-center transition-colors"
              style={{
                backgroundColor: isActive
                  ? 'var(--color-text-primary)'
                  : 'var(--color-surface)',
                color: isActive
                  ? 'var(--color-surface)'
                  : 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                fontFamily: 'var(--font-mono)',
                borderRight:
                  opt.key === 'A4'
                    ? '1px solid var(--color-border)'
                    : 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              <div>{opt.label}</div>
              <div
                className="text-[10px] mt-0.5"
                style={{
                  color: isActive
                    ? 'rgba(255,255,255,0.6)'
                    : 'var(--color-text-muted)',
                }}
              >
                {opt.sub}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
