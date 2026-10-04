'use client';

import React, { useRef, useEffect, useMemo, useState } from 'react';
import type { BreakPoint, RenderResult } from '@/lib/types';

interface PreviewPanelProps {
  renderResult: RenderResult | null;
  breakPoints: BreakPoint[];
  onUpdateBreak?: (index: number, newY: number) => void;
}

/**
 * Scrollable preview of the composite document with page break indicators.
 * Renders the canvas image scaled to fit, with red break lines overlaid.
 */
export default function PreviewPanel({
  renderResult,
  breakPoints,
  onUpdateBreak,
}: PreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const dragStartRef = useRef<{ clientY: number; startY: number } | null>(null);

  const globalScale = useMemo(() => {
    if (!renderResult) return 1;
    return Math.min(1, 600 / renderResult.width);
  }, [renderResult]);

  // Generate scaled-down preview images
  const previewPages = useMemo(() => {
    if (!renderResult) return null;
    
    return renderResult.pages.map(page => {
      const w = Math.floor(page.width * globalScale);
      const h = Math.floor(page.height * globalScale);
      
      const preview = document.createElement('canvas');
      preview.width = w;
      preview.height = h;
      const ctx = preview.getContext('2d')!;
      ctx.drawImage(page.canvas, 0, 0, w, h);
      
      return {
        url: preview.toDataURL('image/jpeg', 0.85),
        width: w,
        height: h,
        yOffset: Math.floor(page.yOffset * globalScale),
        xOffset: Math.floor(((renderResult.width - page.width) / 2) * globalScale)
      };
    });
  }, [renderResult, globalScale]);

  // Scroll to top when new content loads
  useEffect(() => {
    containerRef.current?.scrollTo(0, 0);
  }, [previewPages]);

  // Handle global mouse events for dragging
  useEffect(() => {
    if (draggingIndex === null || !renderResult || !onUpdateBreak) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;
      const dy = e.clientY - dragStartRef.current.clientY;
      const newY = dragStartRef.current.startY + dy / globalScale;
      onUpdateBreak(draggingIndex, newY);
    };

    const handleMouseUp = () => {
      setDraggingIndex(null);
      dragStartRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingIndex, renderResult, globalScale, onUpdateBreak]);

  if (!renderResult || !previewPages) {
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
        <span>{renderResult.height.toLocaleString()}px total</span>
      </div>

      {/* Document preview with break lines */}
      <div 
        className="relative mx-auto bg-white" 
        style={{ 
          width: Math.floor(renderResult.width * globalScale), 
          height: Math.floor(renderResult.height * globalScale) 
        }}
      >
        {previewPages.map((page, i) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={i}
            src={page.url}
            alt={`Page ${i + 1} preview`}
            width={page.width}
            height={page.height}
            className="absolute"
            style={{ 
              top: `${page.yOffset}px`,
              left: `${page.xOffset}px`,
              imageRendering: 'auto' 
            }}
          />
        ))}

        {/* Break lines */}
        {breakPoints.map((bp, i) => {
          const scaledY = Math.floor(bp.y * globalScale);
          const isDragging = draggingIndex === i;
          return (
            <div
              key={i}
              className={`break-line ${isDragging ? 'z-20' : ''}`}
              style={{ 
                top: `${scaledY}px`,
                backgroundColor: isDragging ? 'var(--color-accent)' : 'var(--color-danger)'
              }}
              data-page={`p${i + 2}`}
              onMouseDown={(e) => {
                if (!onUpdateBreak) return;
                e.preventDefault();
                setDraggingIndex(i);
                dragStartRef.current = { clientY: e.clientY, startY: bp.y };
              }}
            >
              {/* Optional handle visual indicator */}
              <div className="absolute left-1/2 -translate-x-1/2 -top-1 w-8 h-2.5 rounded bg-black/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity pointer-events-none">
                <div className="w-4 h-0.5 bg-white/50 rounded-full" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
