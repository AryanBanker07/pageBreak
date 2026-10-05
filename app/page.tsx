'use client';

import React, { useState, useCallback, useRef } from 'react';
import DropZone from '@/components/DropZone';
import PreviewPanel from '@/components/PreviewPanel';
import SensitivitySlider from '@/components/SensitivitySlider';
import PageSizeToggle from '@/components/PageSizeToggle';
import DownloadButton from '@/components/DownloadButton';
import AdSlot from '@/components/AdSlot';
import FAQ from '@/components/FAQ';
import { renderFileToCanvas } from '@/lib/pdfRenderer';
import { detectPageBreaks } from '@/lib/whitespaceDetector';
import { composePdf, downloadPdf } from '@/lib/pdfComposer';
import type { PageSize, BreakPoint, ProcessingState, RenderResult } from '@/lib/types';

export default function Home() {
  const [state, setState] = useState<ProcessingState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [renderResult, setRenderResult] = useState<RenderResult | null>(null);
  const [breakPoints, setBreakPoints] = useState<BreakPoint[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [sensitivity, setSensitivity] = useState<number>(15);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const renderResultRef = useRef<RenderResult | null>(null);

  // ---- File upload handler ----
  const handleFile = useCallback(
    async (file: File) => {
      try {
        setState('rendering');
        setFileName(file.name);
        setErrorMsg(null);
        setStatusMsg('Rendering document…');

        const result = await renderFileToCanvas(file, (msg) =>
          setStatusMsg(msg)
        );
        renderResultRef.current = result;
        setRenderResult(result);

        setState('scanning');
        setStatusMsg('Detecting page breaks…');

        const breaks = detectPageBreaks(
          result,
          pageSize,
          sensitivity,
          (msg) => setStatusMsg(msg)
        );
        setBreakPoints(breaks);

        setState('ready');
        setStatusMsg(
          `Found ${breaks.length} break(s) → ${breaks.length + 1} page(s)`
        );
      } catch (err) {
        setState('error');
        setErrorMsg(
          err instanceof Error ? err.message : 'An unexpected error occurred'
        );
        setStatusMsg('');
      }
    },
    [pageSize, sensitivity]
  );

  // ---- Re-scan when sensitivity or page size changes ----
  const reScan = useCallback(
    (newSensitivity: number, newPageSize: PageSize) => {
      if (!renderResultRef.current) return;

      setState('scanning');
      setStatusMsg('Re-scanning…');

      // Use requestAnimationFrame to keep UI responsive
      requestAnimationFrame(() => {
        try {
          const breaks = detectPageBreaks(
            renderResultRef.current!,
            newPageSize,
            newSensitivity,
            (msg) => setStatusMsg(msg)
          );
          setBreakPoints(breaks);
          setState('ready');
          setStatusMsg(
            `Found ${breaks.length} break(s) → ${breaks.length + 1} page(s)`
          );
        } catch (err) {
          setState('error');
          setErrorMsg(
            err instanceof Error ? err.message : 'Scan failed'
          );
        }
      });
    },
    []
  );

  const handleSensitivityChange = useCallback(
    (val: number) => {
      setSensitivity(val);
      reScan(val, pageSize);
    },
    [pageSize, reScan]
  );

  const handlePageSizeChange = useCallback(
    (size: PageSize) => {
      setPageSize(size);
      reScan(sensitivity, size);
    },
    [sensitivity, reScan]
  );

  // ---- Update break handler ----
  const handleUpdateBreak = useCallback((index: number, newY: number) => {
    setBreakPoints((prev) => {
      const newBreaks = [...prev];
      const bp = newBreaks[index];
      const min = index === 0 ? 0 : newBreaks[index - 1].y + 10;
      
      const totalH = renderResultRef.current?.height ?? 0;
      const max = index === newBreaks.length - 1 ? totalH : newBreaks[index + 1].y - 10;
      
      newBreaks[index] = {
        ...bp,
        y: Math.max(min, Math.min(max, newY))
      };
      
      return newBreaks;
    });
  }, []);

  // ---- Download handler ----
  const handleDownload = useCallback(async () => {
    if (!renderResultRef.current) return;

    try {
      setState('composing');
      setStatusMsg('Composing final PDF…');

      const pdfBytes = await composePdf(
        renderResultRef.current,
        breakPoints,
        pageSize,
        (msg) => setStatusMsg(msg)
      );

      const outName = fileName
        ? fileName.replace(/\.[^.]+$/, '') + '-paginated.pdf'
        : 'paginated-output.pdf';

      downloadPdf(pdfBytes, outName);

      setState('done');
      setStatusMsg('Download started!');

      // Reset status after a moment
      setTimeout(() => {
        setState('ready');
        setStatusMsg(
          `${breakPoints.length + 1} page(s) ready`
        );
      }, 3000);
    } catch (err) {
      setState('error');
      setErrorMsg(
        err instanceof Error ? err.message : 'PDF composition failed'
      );
    }
  }, [breakPoints, pageSize, fileName]);

  // ---- Derived state ----
  const isProcessing = ['rendering', 'scanning', 'composing'].includes(state);
  const isReady = state === 'ready' || state === 'done';

  const statusBadgeClass = isProcessing
    ? 'status-badge status-badge--processing'
    : state === 'error'
      ? 'status-badge status-badge--error'
      : isReady
        ? 'status-badge status-badge--ready'
        : 'status-badge';

  return (
    <div
      id="app-root"
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ===== HEADER ===== */}
      <header
        id="app-header"
        className="px-6 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div>
            <h1
              className="text-lg font-semibold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              PageBreak
            </h1>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Smart page break detection for Apple Notes exports
            </p>
          </div>
          {state !== 'idle' && (
            <div className={statusBadgeClass}>{statusMsg || state}</div>
          )}
        </div>
      </header>

      {/* ===== LEADERBOARD AD ===== */}
      <div
        className="py-3"
        style={{
          borderBottom: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-alt)',
        }}
      >
        <div className="max-w-[1200px] mx-auto flex justify-center">
          <AdSlot width={728} height={90} />
        </div>
      </div>

      {/* ===== MAIN WORKSPACE ===== */}
      <main id="main-content" className="flex-1 px-6 py-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Upload zone — shown prominently when idle */}
          {state === 'idle' && (
            <section id="upload-section" className="max-w-[600px] mx-auto py-8">
              <div className="text-center mb-6">
                <h2
                  className="text-2xl font-semibold tracking-tight mb-2"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Fix sliced page breaks
                </h2>
                <p
                  className="text-sm leading-relaxed max-w-md mx-auto"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Apple Notes cuts through your handwriting when exporting to
                  PDF. Upload your continuous PDF or screenshot and get
                  perfectly paginated output.
                </p>
              </div>
                <DropZone onFile={handleFile} disabled={isProcessing || !termsAccepted} />
                
                {/* Terms and Conditions */}
                <div className="mt-6 text-left border rounded p-4 text-[11px] leading-relaxed" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface-alt)', color: 'var(--color-text-secondary)' }}>
                  <h3 className="font-semibold mb-2 text-xs" style={{ color: 'var(--color-text-primary)' }}>Terms and Conditions</h3>
                  <p className="mb-2">
                    By using this tool, you acknowledge and agree that <strong>YOU</strong> are solely responsible for any and all mistakes, bad page crops, sliced diagrams, lost data, failed homework assignments, or general life dissatisfaction resulting from the use of this free software.
                  </p>
                  <p className="mb-3">
                    If a page break slices perfectly through your most important equation, that is entirely your fault for not reviewing the preview. We accept zero liability. The software is provided &quot;as is&quot;, and any failure is definitively a &quot;user error&quot;.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      className="mt-0.5 cursor-pointer accent-[#0066FF]"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      disabled={isProcessing}
                    />
                    <span className="font-medium group-hover:text-[#0066FF] transition-colors" style={{ color: termsAccepted ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                      I have read these terms and accept full blame for any mistakes.
                    </span>
                  </label>
                </div>

                <div
                  className="mt-6 text-center text-[11px]"
                  style={{
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  100% client-side · Your files never leave your device
                </div>
              </div>
            )}

          {/* Workspace — shown after file upload */}
          {state !== 'idle' && (
            <div className="flex gap-6 flex-col lg:flex-row">
              {/* Left: Preview */}
              <div className="flex-1 min-w-0">
                {/* Compact re-upload zone */}
                <div className="mb-4">
                  <DropZone
                    onFile={handleFile}
                    disabled={isProcessing}
                    currentFileName={fileName}
                  />
                </div>

                {/* Error message */}
                {errorMsg && (
                  <div
                    className="mb-4 px-4 py-3 rounded text-sm"
                    style={{
                      backgroundColor: 'rgba(211, 47, 47, 0.08)',
                      border: '1px solid var(--color-danger)',
                      color: 'var(--color-danger)',
                    }}
                  >
                    {errorMsg}
                  </div>
                )}

                {/* Preview panel */}
                <PreviewPanel
                  renderResult={renderResult}
                  breakPoints={breakPoints}
                  onUpdateBreak={handleUpdateBreak}
                />
              </div>

              {/* Right: Controls + Ad */}
              <div className="w-full lg:w-[320px] flex flex-col gap-5 flex-shrink-0">
                {/* Controls card */}
                <div
                  className="rounded-md p-5 flex flex-col gap-5"
                  style={{
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  <div
                    className="text-xs font-medium uppercase tracking-wide pb-2"
                    style={{
                      color: 'var(--color-text-muted)',
                      borderBottom: '1px solid var(--color-border)',
                    }}
                  >
                    Settings
                  </div>

                  <PageSizeToggle
                    value={pageSize}
                    onChange={handlePageSizeChange}
                    disabled={isProcessing}
                  />

                  <SensitivitySlider
                    value={sensitivity}
                    onChange={handleSensitivityChange}
                    disabled={isProcessing}
                  />

                  <DownloadButton
                    onClick={handleDownload}
                    disabled={!isReady}
                    isComposing={state === 'composing'}
                    pageCount={breakPoints.length + 1}
                  />
                </div>

                {/* Rectangle Ad */}
                <AdSlot width={300} height={250} />

                {/* Privacy note */}
                <div
                  className="text-[11px] text-center leading-relaxed"
                  style={{
                    color: 'var(--color-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  All processing happens in your browser.
                  <br />
                  Files are never uploaded to any server.
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* ===== SEO FAQ SECTION (Shown only when idle) ===== */}
        {state === 'idle' && (
          <FAQ />
        )}
      </main>

      {/* ===== FOOTER ===== */}
      <footer
        className="px-6 py-4 mt-auto"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface-alt)',
        }}
      >
        <div
          className="max-w-[1200px] mx-auto flex items-center justify-between text-[11px]"
          style={{
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          <span>PageBreak v1.0</span>
          <a 
            href="upi://pay?pa=banker.aryan@okicici" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-red-600 hover:text-red-700 transition-colors flex items-center gap-1 font-medium"
            title="Donate via UPI"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            Donate
          </a>
          <span>Client-side PDF processing · Zero data collection</span>
        </div>
      </footer>
    </div>
  );
}
