'use client';

import React, { useCallback, useRef, useState } from 'react';

interface DropZoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
  currentFileName?: string | null;
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp';
const ACCEPT_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];

export default function DropZone({
  onFile,
  disabled = false,
  currentFileName = null,
}: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (disabled) return;
      if (!ACCEPT_MIME.includes(file.type)) {
        alert('Unsupported file type. Please upload a PDF or image (PNG, JPG, WebP).');
        return;
      }
      onFile(file);
    },
    [onFile, disabled]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragging(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile, disabled]
  );

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so re-selecting the same file triggers change
      e.target.value = '';
    },
    [handleFile]
  );

  const openPicker = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={openPicker}
      className={`
        dropzone-border rounded-md cursor-pointer
        flex flex-col items-center justify-center gap-3
        py-10 px-6 text-center transition-all
        ${isDragging ? 'dropzone-border--active' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--color-text-muted)]'}
      `}
      role="button"
      tabIndex={0}
      aria-label="Upload a PDF or image file"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') openPicker();
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onInputChange}
        className="hidden"
        disabled={disabled}
      />

      {/* Upload icon */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: isDragging ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" />
        <line x1="12" y1="3" x2="12" y2="15" />
      </svg>

      {currentFileName ? (
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {currentFileName}
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Drop another file to replace
          </p>
        </div>
      ) : (
        <div>
          <p
            className="text-sm font-medium"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Drop your PDF or screenshot here
          </p>
          <p
            className="text-xs mt-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
            or click to browse · PDF, PNG, JPG, WebP
          </p>
        </div>
      )}

      {!currentFileName && (
        <button
          type="button"
          disabled={disabled}
          className="mt-2 px-5 py-2 text-sm font-medium rounded transition-colors text-white"
          style={{
            backgroundColor: 'var(--color-accent)',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = 'var(--color-accent)')
          }
          onClick={(e) => {
            e.stopPropagation();
            openPicker();
          }}
        >
          Upload File
        </button>
      )}
    </div>
  );
}
