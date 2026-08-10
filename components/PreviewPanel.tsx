'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import type { BreakPoint } from '@/lib/types';

interface PreviewPanelProps {
  canvas: HTMLCanvasElement | null;
  breakPoints: BreakPoint[];
  totalHeight: number;
}

/**
 * Scrollable preview of the composite document with page break indicators.
 * Renders the canvas image scaled to fit, with red break lines overlaid.
 */
export default function PreviewPanel({
  canvas,
  breakPoints,
  totalHeight,
}: PreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Generate a scaled-down preview image
  const previewDataUrl = useMemo(() => {
    if (!canvas) return null;
    // Scale to a reasonable preview width (max 600px)
    const maxW = 600;
    const scale = Math.min(1, maxW / canvas.width);
    const w = Math.floor(canvas.width * scale);
    const h = Math.floor(canvas.height * scale);

    const preview = document.createElement('canvas');
    preview.width = w;
    preview.height = h;
    const ctx = preview.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0, w, h);
    return { url: preview.toDataURL('image/png'), width: w, height: h, scale };
  }, [canvas]);

  // Scroll to top when new content loads
  useEffect(() => {
    containerRef.current?.scrollTo(0, 0);
  }, [previewDataUrl]);

  if (!canvas || !previewDataUrl) {
    return (
      <div
        className="flex items-center justify-center rounded-md h-full min-h-[300px]"
        style={{
          border: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-alt)',
          color: 'var(--color-text-muted)',
        }}
      >
        <div className="text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mx-auto mb-3 opacity-40"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="3" y1="15" x2="21" y2="15" />
          </svg>
          <p className="text-sm">Preview will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="preview-scroll relative overflow-y-auto rounded-md"
      style={{
        border: '1px solid var(--color-border)',
        maxHeight: '70vh',
        backgroundColor: 'var(--color-surface-alt)',
      }}
    >
      {/* Page count badge */}
      <div
        className="sticky top-0 z-10 px-3 py-1.5 text-xs flex items-center justify-between"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
          fontFamily: 'var(--font-mono)',
          color: 'var(--color-text-secondary)',
        }}
      >
        <span>{breakPoints.length + 1} page(s)</span>
        <span>{totalHeight.toLocaleString()}px total</span>
      </div>

      {/* Document preview with break lines */}
      <div className="relative mx-auto" style={{ width: previewDataUrl.width }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewDataUrl.url}
          alt="Document preview"
          width={previewDataUrl.width}
          height={previewDataUrl.height}
          className="block"
          style={{ imageRendering: 'auto' }}
        />

        {/* Break lines */}
        {breakPoints.map((bp, i) => {
          const scaledY = Math.floor(bp.y * previewDataUrl.scale);
          return (
            <div
              key={i}
              className="break-line"
              style={{ top: `${scaledY}px` }}
              data-page={`p${i + 2}`}
            />
          );
        })}
      </div>
    </div>
  );
}
