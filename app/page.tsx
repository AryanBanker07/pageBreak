'use client';

import React, { useState, useCallback, useRef } from 'react';
import DropZone from '@/components/DropZone';
import PreviewPanel from '@/components/PreviewPanel';
import SensitivitySlider from '@/components/SensitivitySlider';
import PageSizeToggle from '@/components/PageSizeToggle';
import DownloadButton from '@/components/DownloadButton';
import AdSlot from '@/components/AdSlot';
import { renderFileToCanvas } from '@/lib/pdfRenderer';
import { detectPageBreaks } from '@/lib/whitespaceDetector';
import { composePdf, downloadPdf } from '@/lib/pdfComposer';
import type { PageSize, BreakPoint, ProcessingState } from '@/lib/types';

export default function Home() {
  const [state, setState] = useState<ProcessingState>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const [breakPoints, setBreakPoints] = useState<BreakPoint[]>([]);
  const [pageSize, setPageSize] = useState<PageSize>('A4');
  const [sensitivity, setSensitivity] = useState<number>(15);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [totalHeight, setTotalHeight] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
        canvasRef.current = result.canvas;
        setCanvas(result.canvas);
        setTotalHeight(result.height);

        setState('scanning');
        setStatusMsg('Detecting page breaks…');

        const breaks = detectPageBreaks(
          result.canvas,
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
      if (!canvasRef.current) return;

      setState('scanning');
      setStatusMsg('Re-scanning…');

      // Use requestAnimationFrame to keep UI responsive
      requestAnimationFrame(() => {
        try {
          const breaks = detectPageBreaks(
            canvasRef.current!,
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

  // ---- Download handler ----
  const handleDownload = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      setState('composing');
      setStatusMsg('Composing final PDF…');

      const pdfBytes = await composePdf(
        canvasRef.current,
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
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: 'var(--color-surface)' }}
    >
      {/* ===== HEADER ===== */}
      <header
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
      <main className="flex-1 px-6 py-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Upload zone — shown prominently when idle */}
          {state === 'idle' && (
            <div className="max-w-[600px] mx-auto py-8">
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
                    If a page break slices perfectly through your most important equation, that is entirely your fault for not reviewing the preview. We accept zero liability. The software is provided "as is", and any failure is definitively a "user error".
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
                  canvas={canvas}
                  breakPoints={breakPoints}
                  totalHeight={totalHeight}
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
          <div className="max-w-[800px] mx-auto mt-24 mb-12">
            <h2 
              className="text-xl font-semibold mb-6"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Why does Apple Notes cut through my handwriting when exporting to PDF?</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Apple Notes exports handwritten content as a continuous document and inserts page breaks at fixed intervals without analyzing the content. This often results in text, drawings, and images being sliced in half at page boundaries. PageBreak fixes this by intelligently detecting whitespace gaps between your content lines.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Is my data safe? Does PageBreak upload my files?</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Yes, your data is completely safe. PageBreak processes everything 100% in your browser using client-side JavaScript. Your PDF and image files are never uploaded to any server. No data ever leaves your device.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>What file formats does PageBreak support?</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>PageBreak accepts PDF files and image formats including PNG, JPG/JPEG, and WebP. You can upload a multi-page continuous PDF exported from Apple Notes, or a long screenshot of your handwritten notes.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Does PageBreak work with dark mode or colored backgrounds?</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Yes. PageBreak uses a color-agnostic variance-based detection algorithm that works with any text color on any background color, including dark mode notes, colored stationery, and documents with embedded images.</p>
              </div>
              
              <div>
                <h3 className="font-medium text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>Is PageBreak free to use?</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>Yes, PageBreak is completely free. There are no usage limits, no sign-up required, and no watermarks on the output PDF.</p>
              </div>
            </div>
          </div>
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
