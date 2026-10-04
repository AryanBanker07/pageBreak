/**
 * pdfRenderer.ts
 *
 * Renders a PDF (via pdfjs-dist) or image file into a single tall composite
 * HTMLCanvasElement by stitching all pages/the image vertically.
 *
 * Entirely client-side — no server calls.
 */

import type { PDFDocumentProxy } from 'pdfjs-dist';
import { isRowEmpty } from './whitespaceDetector';
import type { RenderResult, RenderedPage } from './types';

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



/**
 * Render all pages of a PDF into a single vertically-stitched canvas.
 * 
 * To fix Apple Notes slicing artifacts, this function strips all empty
 * top/bottom margins from each page before stacking them with 0px gap.
 * This perfectly rejoins handwriting or images that were sliced exactly in half.
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

  const pages: RenderedPage[] = [];
  let totalHeight = 0;
  let maxWidth = 0;

  for (let i = 1; i <= numPages; i++) {
    onProgress?.(`Rendering & scanning page ${i} / ${numPages}`);

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;
    const tempCtx = tempCanvas.getContext('2d')!;

    // Fill white background to avoid transparent alpha issues during scan
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    await page.render({
      canvasContext: tempCtx,
      canvas: tempCanvas,
      viewport,
    }).promise;

    // Scan for content boundaries (crop margins)
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const width = tempCanvas.width;
    const height = tempCanvas.height;
    const sampleStep = width > 2000 ? 2 : 1;

    let contentTop = 0;
    while (contentTop < height && isRowEmpty(imageData, contentTop, width, sampleStep)) {
      contentTop++;
    }

    let contentBottom = height - 1;
    while (contentBottom > contentTop && isRowEmpty(imageData, contentBottom, width, sampleStep)) {
      contentBottom--;
    }

    // Skip entirely empty pages
    if (contentTop >= height) {
      continue;
    }

    const croppedHeight = contentBottom - contentTop + 1;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = croppedHeight;
    const croppedCtx = croppedCanvas.getContext('2d')!;
    
    // Draw only the cropped region
    croppedCtx.drawImage(
      tempCanvas,
      0, contentTop, width, croppedHeight,
      0, 0, width, croppedHeight
    );

    pages.push({ canvas: croppedCanvas, width, height: croppedHeight, yOffset: totalHeight });
    totalHeight += croppedHeight;
    maxWidth = Math.max(maxWidth, width);
  }

  onProgress?.(`Successfully processed ${pages.length} pages.`);

  return { pages, width: maxWidth, height: totalHeight };
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
      resolve({ 
        pages: [{ canvas, width: img.naturalWidth, height: img.naturalHeight, yOffset: 0 }], 
        width: img.naturalWidth, 
        height: img.naturalHeight 
      });
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
