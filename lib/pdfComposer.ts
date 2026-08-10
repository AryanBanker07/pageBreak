/**
 * pdfComposer.ts
 *
 * Takes the composite canvas + break coordinates + page size and produces
 * a properly paginated PDF using pdf-lib.
 *
 * For each slice between consecutive breaks:
 *   1. Extract the vertical strip from the canvas
 *   2. Convert to PNG
 *   3. Embed into a new pdf-lib page at the correct size
 *   4. Center content with margins
 */

import { PDFDocument } from 'pdf-lib';
import {
  PAGE_SIZES,
  PAGE_MARGIN_PT,
  type PageSize,
  type BreakPoint,
} from './types';

/**
 * Extract a horizontal slice from the composite canvas as a PNG data URL.
 */
function extractSlice(
  sourceCanvas: HTMLCanvasElement,
  startY: number,
  endY: number
): string {
  const width = sourceCanvas.width;
  const sliceHeight = endY - startY;

  const sliceCanvas = document.createElement('canvas');
  sliceCanvas.width = width;
  sliceCanvas.height = sliceHeight;
  const ctx = sliceCanvas.getContext('2d')!;

  // White background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, sliceHeight);

  // Draw the slice from the source
  ctx.drawImage(
    sourceCanvas,
    0,
    startY,
    width,
    sliceHeight,
    0,
    0,
    width,
    sliceHeight
  );

  return sliceCanvas.toDataURL('image/png');
}

/**
 * Convert a data URL to a Uint8Array.
 */
function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Compose a paginated PDF from the composite canvas and break points.
 */
export async function composePdf(
  canvas: HTMLCanvasElement,
  breakPoints: BreakPoint[],
  pageSize: PageSize,
  onProgress?: (msg: string) => void
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const dims = PAGE_SIZES[pageSize];

  // Build the list of vertical slices
  const sliceYs = [0, ...breakPoints.map((bp) => bp.y), canvas.height];
  const totalPages = sliceYs.length - 1;

  for (let i = 0; i < totalPages; i++) {
    const startY = sliceYs[i];
    const endY = sliceYs[i + 1];
    const sliceHeight = endY - startY;

    if (sliceHeight <= 0) continue;

    onProgress?.(`Composing page ${i + 1} / ${totalPages}`);

    // Extract the slice as PNG
    const pngDataUrl = extractSlice(canvas, startY, endY);
    const pngBytes = dataUrlToBytes(pngDataUrl);
    const pngImage = await pdfDoc.embedPng(pngBytes);

    // Calculate how to fit the slice onto the page with margins
    const usableWidth = dims.widthPt - 2 * PAGE_MARGIN_PT;
    const usableHeight = dims.heightPt - 2 * PAGE_MARGIN_PT;

    // Scale the image to fit the usable width
    const scaleX = usableWidth / canvas.width;
    const scaledHeight = sliceHeight * scaleX;

    // If the scaled height exceeds usable height, scale down further
    const finalScale =
      scaledHeight > usableHeight
        ? Math.min(scaleX, usableHeight / sliceHeight)
        : scaleX;

    const finalWidth = canvas.width * finalScale;
    const finalHeight = sliceHeight * finalScale;

    // Create a page
    const page = pdfDoc.addPage([dims.widthPt, dims.heightPt]);

    // Center horizontally, align to top with margin
    const x = PAGE_MARGIN_PT + (usableWidth - finalWidth) / 2;
    const y = dims.heightPt - PAGE_MARGIN_PT - finalHeight; // PDF y=0 is bottom

    page.drawImage(pngImage, {
      x,
      y,
      width: finalWidth,
      height: finalHeight,
    });
  }

  onProgress?.('Saving PDF...');
  const pdfBytes = await pdfDoc.save();
  onProgress?.('Done!');

  return pdfBytes;
}

/**
 * Trigger a browser download of the composed PDF.
 */
export function downloadPdf(
  pdfBytes: Uint8Array,
  fileName: string = 'paginated-output.pdf'
): void {
  const plainBuffer = new ArrayBuffer(pdfBytes.byteLength);
  new Uint8Array(plainBuffer).set(pdfBytes);
  const blob = new Blob([plainBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
