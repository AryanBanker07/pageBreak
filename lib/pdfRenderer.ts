/**
 * pdfRenderer.ts
 *
 * Renders a PDF (via pdfjs-dist) or image file into a single tall composite
 * HTMLCanvasElement by stitching all pages/the image vertically.
 *
 * Entirely client-side — no server calls.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';

// We dynamically import pdfjs-dist to avoid SSR issues in Next.js
let pdfjsLib: typeof import('pdfjs-dist') | null = null;

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib;
  pdfjsLib = await import('pdfjs-dist');

  // Set up the worker from the CDN matching the installed version
  const pdfjsVersion = pdfjsLib.version;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsVersion}/pdf.worker.min.mjs`;

  return pdfjsLib;
}

export interface RenderResult {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

/**
 * Render all pages of a PDF into a single vertically-stitched canvas.
 */
async function renderPdf(
  arrayBuffer: ArrayBuffer,
  scale: number = 2,
  onProgress?: (msg: string) => void
): Promise<RenderResult> {
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) });
  const pdf: PDFDocumentProxy = await loadingTask.promise;
  const numPages = pdf.numPages;

  onProgress?.(`Loaded PDF with ${numPages} page(s)`);

  // First pass: measure all pages to know the composite dimensions
  const pageDims: { w: number; h: number }[] = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    pageDims.push({ w: viewport.width, h: viewport.height });
    totalHeight += viewport.height;
    maxWidth = Math.max(maxWidth, viewport.width);
  }

  // Create the composite canvas
  const canvas = document.createElement('canvas');
  canvas.width = maxWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d')!;

  // Fill white background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Second pass: render each page onto the composite canvas
  let yOffset = 0;
  for (let i = 1; i <= numPages; i++) {
    onProgress?.(`Rendering page ${i} / ${numPages}`);

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    // Render to a temporary canvas first
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    await page.render({
      canvasContext: tempCtx,
      canvas: tempCanvas,
      viewport,
    }).promise;

    // Draw the temp canvas onto the composite at the current y offset
    // Center horizontally if this page is narrower than max
    const xOffset = Math.floor((maxWidth - viewport.width) / 2);
    ctx.drawImage(tempCanvas, xOffset, yOffset);

    yOffset += viewport.height;
  }

  return { canvas, width: maxWidth, height: totalHeight };
}

/**
 * Render an image file (PNG, JPG, etc.) into a canvas.
 */
async function renderImage(
  arrayBuffer: ArrayBuffer,
  mimeType: string,
  onProgress?: (msg: string) => void
): Promise<RenderResult> {
  onProgress?.('Loading image...');

  const blob = new Blob([arrayBuffer], { type: mimeType });
  const url = URL.createObjectURL(blob);

  return new Promise<RenderResult>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d')!;

      // White background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      URL.revokeObjectURL(url);
      onProgress?.(`Image loaded: ${img.naturalWidth}×${img.naturalHeight}`);
      resolve({ canvas, width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

/**
 * Main entry: render any supported file to a composite canvas.
 */
export async function renderFileToCanvas(
  file: File,
  onProgress?: (msg: string) => void
): Promise<RenderResult> {
  const arrayBuffer = await file.arrayBuffer();

  if (file.type === 'application/pdf') {
    return renderPdf(arrayBuffer, 2, onProgress);
  }

  if (file.type.startsWith('image/')) {
    return renderImage(arrayBuffer, file.type, onProgress);
  }

  throw new Error(`Unsupported file type: ${file.type}`);
}
