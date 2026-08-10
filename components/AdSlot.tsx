'use client';

import React from 'react';

interface AdSlotProps {
  width: number;
  height: number;
  label?: string;
  className?: string;
}

/**
 * Reusable ad placeholder with IAB-standard dimensions.
 * Gray-bordered box with a centered "Advertisement" label.
 * Ready for real ad code injection.
 */
export default function AdSlot({
  width,
  height,
  label = 'Advertisement',
  className = '',
}: AdSlotProps) {
  return (
    <div
      className={`flex flex-col items-center ${className}`}
      role="complementary"
      aria-label={label}
    >
      <span
        className="text-[10px] tracking-[0.08em] uppercase mb-1"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        {label}
      </span>
      <div
        className="flex items-center justify-center border border-dashed"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          maxWidth: '100%',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-surface-alt)',
          color: 'var(--color-text-muted)',
          fontSize: '12px',
          fontFamily: 'var(--font-mono)',
        }}
      >
        {width}×{height}
      </div>
    </div>
  );
}
