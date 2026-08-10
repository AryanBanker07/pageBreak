'use client';

import React from 'react';

interface DownloadButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isComposing?: boolean;
  pageCount?: number;
}

/**
 * Prominent accent-colored download button.
 * Shows page count when ready, spinner when composing.
 */
export default function DownloadButton({
  onClick,
  disabled = false,
  isComposing = false,
  pageCount = 0,
}: DownloadButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isComposing}
      className="w-full py-3 px-6 rounded font-medium text-sm transition-colors flex items-center justify-center gap-2 text-white"
      style={{
        backgroundColor:
          disabled || isComposing
            ? 'var(--color-border-strong)'
            : 'var(--color-accent)',
        cursor: disabled || isComposing ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled && !isComposing)
          e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
      }}
      onMouseLeave={(e) => {
        if (!disabled && !isComposing)
          e.currentTarget.style.backgroundColor = 'var(--color-accent)';
      }}
    >
      {isComposing ? (
        <>
          {/* Simple spinner */}
          <svg
            className="animate-spin"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" opacity="0.75" />
          </svg>
          Composing PDF…
        </>
      ) : (
        <>
          {/* Download icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Download PDF
          {pageCount > 0 && (
            <span
              className="text-xs px-1.5 py-0.5 rounded ml-1"
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                fontSize: '10px',
              }}
            >
              {pageCount} pg
            </span>
          )}
        </>
      )}
    </button>
  );
}
