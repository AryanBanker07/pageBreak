/**
 * whitespaceDetector.ts
 *
 * Scans a composite canvas row-by-row to find horizontal "empty" zones
 * (gaps between content) where page breaks can be safely inserted.
 *
 * COLOR-AGNOSTIC ALGORITHM (works with any background / text color):
 *
 * Instead of looking for "white" rows (brightness-based), we measure
 * per-row pixel VARIANCE. A row that is all one color — whether white,
 * black, dark blue, or any solid background — has near-zero variance.
 * A row containing text, handwriting, or images has high variance because
 * the pixel values differ significantly across the row.
 *
 * Steps:
 * 1. For each row y, compute the variance of luminance values across
 *    all pixels. Luminance = 0.299R + 0.587G + 0.114B.
 * 2. A row is "empty" (background-only) if its variance < threshold.
 * 3. Track consecutive runs of empty rows → these are "safe break zones."
 * 4. Given a target page height, walk down the canvas and snap breaks
 *    to the nearest safe zone midpoint.
 *
 * This handles:
 * - White text on dark backgrounds (dark mode notes)
 * - Colored backgrounds with any text color
 * - Embedded images (high variance → never treated as empty)
 * - Gradients / subtle textures (tunable via threshold)
 */

import {
  PAGE_SIZES,
  PAGE_MARGIN_PT,
  type PageSize,
  type BreakPoint,
  type WhitespaceZone,
  type RenderResult,
} from './types';

/**
 * Default variance threshold.
 * Rows with luminance variance below this are considered "empty."
 *
 * Typical values:
 * - Pure solid background: variance ≈ 0
 * - Background with slight JPEG noise: variance ≈ 5–20
 * - Row with a thin stroke crossing: variance ≈ 50–200
 * - Row through dense text: variance ≈ 500–2000
 * - Row through a photograph: variance ≈ 1000–5000+
 *
 * Default 30 handles clean digital backgrounds with room for minor noise.
 */
const DEFAULT_VARIANCE_THRESHOLD = 30;

/**
 * Compute the variance of luminance values for a single row of pixels.
 *
 * Variance = E[X²] - (E[X])² — computed in a single pass.
 * Uses luminance: 0.299R + 0.587G + 0.114B
 *
 * To avoid expensive full-row scans on very wide images, we can
 * sample every Nth pixel. For most documents, sampling every 2nd
 * pixel is indistinguishable from full sampling.
 */
function rowVariance(
  imageData: ImageData,
  y: number,
  width: number,
  sampleStep: number = 1
): number {
  const data = imageData.data;
  const rowStart = y * width * 4;
  let sumLum = 0;
  let sumLumSq = 0;
  let count = 0;

  for (let x = 0; x < width; x += sampleStep) {
    const idx = rowStart + x * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;
    sumLum += lum;
    sumLumSq += lum * lum;
    count++;
  }

  if (count === 0) return 0;

  const mean = sumLum / count;
  const variance = sumLumSq / count - mean * mean;

  return Math.max(0, variance); // Guard against floating-point noise
}

/**
 * Compute the proportion of pixels in a row that differ significantly
 * from the row's dominant (median-approximated) color.
 *
 * This is a secondary check: even if overall variance is lowish,
 * a thin line of text crossing the row will show up as a small %
 * of "outlier" pixels. We use this to avoid breaking through
 * single strokes.
 */
function rowOutlierFraction(
  imageData: ImageData,
  y: number,
  width: number,
  sampleStep: number = 2
): number {
  const data = imageData.data;
  const rowStart = y * width * 4;

  // First pass: approximate the background luminance using the
  // median of a subsample (we use the midpoint of sorted values
  // from a small sample for speed).
  const sampleLums: number[] = [];
  const quickStep = Math.max(sampleStep, Math.floor(width / 64));
  for (let x = 0; x < width; x += quickStep) {
    const idx = rowStart + x * 4;
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    sampleLums.push(lum);
  }
  sampleLums.sort((a, b) => a - b);
  const bgLum = sampleLums[Math.floor(sampleLums.length / 2)];

  // Second pass: count pixels that deviate from bgLum by more than 25 units
  const deviationThreshold = 25;
  let outliers = 0;
  let total = 0;

  for (let x = 0; x < width; x += sampleStep) {
    const idx = rowStart + x * 4;
    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
    if (Math.abs(lum - bgLum) > deviationThreshold) {
      outliers++;
    }
    total++;
  }

  return total > 0 ? outliers / total : 0;
}

/**
 * Determines if a single row is "empty" (pure background) based on
 * its luminance variance and outlier pixel fraction.
 */
export function isRowEmpty(
  imageData: ImageData,
  y: number,
  width: number,
  sampleStep: number = 1,
  varianceThreshold: number = DEFAULT_VARIANCE_THRESHOLD
): boolean {
  const maxOutlierFraction = 0.02; // 2%

  const variance = rowVariance(imageData, y, width, sampleStep);
  let empty = variance < varianceThreshold;

  // Secondary check for borderline rows
  if (empty && variance > varianceThreshold * 0.3) {
    const outlierFrac = rowOutlierFraction(imageData, y, width, sampleStep);
    empty = outlierFrac < maxOutlierFraction;
  }

  return empty;
}

/**
 * Find all empty (background-only) zones in the canvas.
 *
 * A zone is a run of consecutive rows where:
 *   1. Row luminance variance < varianceThreshold
 *   2. Outlier pixel fraction < 2% (catches thin strokes)
 *
 * Both conditions must hold for a row to be "empty."
 */
export function findWhitespaceZones(
  renderResult: RenderResult,
  minHeight: number = 10,
  varianceThreshold: number = DEFAULT_VARIANCE_THRESHOLD
): WhitespaceZone[] {
  const width = renderResult.width;
  const height = renderResult.height;

  // Choose sampling step based on width: for wide canvases, sample every 2nd pixel
  const sampleStep = width > 2000 ? 2 : 1;

  const CHUNK_HEIGHT = 512;
  const zones: WhitespaceZone[] = [];
  let currentRunStart: number | null = null;

  for (let chunkY = 0; chunkY < height; chunkY += CHUNK_HEIGHT) {
    const chunkH = Math.min(CHUNK_HEIGHT, height - chunkY);
    
    // Create a temporary canvas for this chunk to stitch overlapping pages
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = chunkH;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.fillStyle = '#FFFFFF';
    tempCtx.fillRect(0, 0, width, chunkH);

    for (const page of renderResult.pages) {
      const pageTop = page.yOffset;
      const pageBottom = page.yOffset + page.height;
      const chunkBottom = chunkY + chunkH;

      if (pageBottom > chunkY && pageTop < chunkBottom) {
        const drawY = pageTop - chunkY;
        const drawX = Math.floor((width - page.width) / 2);
        tempCtx.drawImage(page.canvas, drawX, drawY);
      }
    }

    const imageData = tempCtx.getImageData(0, 0, width, chunkH);

    for (let localY = 0; localY < chunkH; localY++) {
      const globalY = chunkY + localY;
      const isEmpty = isRowEmpty(imageData, localY, width, sampleStep, varianceThreshold);

      if (isEmpty) {
        if (currentRunStart === null) {
          currentRunStart = globalY;
        }
      } else {
        if (currentRunStart !== null) {
          const runHeight = globalY - currentRunStart;
          if (runHeight >= minHeight) {
            zones.push({
              startY: currentRunStart,
              endY: globalY - 1,
              height: runHeight,
            });
          }
          currentRunStart = null;
        }
      }
    }
  }

  // Close any trailing empty zone
  if (currentRunStart !== null) {
    const runHeight = height - currentRunStart;
    if (runHeight >= minHeight) {
      zones.push({
        startY: currentRunStart,
        endY: height - 1,
        height: runHeight,
      });
    }
  }

  return zones;
}

/**
 * Calculate the target page height in canvas pixels.
 */
function getPageHeightInPx(
  canvasWidth: number,
  pageSize: PageSize,
  renderScale: number = 2
): number {
  const dims = PAGE_SIZES[pageSize];
  const usableWidthPt = dims.widthPt - 2 * PAGE_MARGIN_PT;
  const usableHeightPt = dims.heightPt - 2 * PAGE_MARGIN_PT;

  const effectiveScale = canvasWidth / (usableWidthPt * renderScale);
  const pageHeightPx = usableHeightPt * renderScale * effectiveScale;

  return Math.floor(pageHeightPx);
}

/**
 * Determine page break positions.
 *
 * Walks down the canvas. Whenever accumulated content height approaches
 * the target page height, finds the nearest safe break zone ABOVE that
 * point and inserts a break at the zone's midpoint.
 *
 * If no suitable zone is found within a lookback window, forces a break
 * at the target height (last resort — may clip content).
 */
export function detectPageBreaks(
  renderResult: RenderResult,
  pageSize: PageSize,
  sensitivity: number = 10, // min empty-zone height in px
  onProgress?: (msg: string) => void
): BreakPoint[] {
  onProgress?.('Scanning for empty zones (color-agnostic)...');

  const zones = findWhitespaceZones(renderResult, sensitivity);
  const pageHeightPx = getPageHeightInPx(renderResult.width, pageSize);
  const breaks: BreakPoint[] = [];

  onProgress?.(
    `Found ${zones.length} empty zone(s). Page height: ${pageHeightPx}px`
  );

  if (renderResult.height <= pageHeightPx) {
    return [];
  }

  let currentY = 0;

  while (currentY + pageHeightPx < renderResult.height) {
    const targetY = currentY + pageHeightPx;

    // Look for zones whose midpoint is closest to targetY,
    // within a window from 60% of page height to slightly past the target.
    const lookbackLimit = currentY + pageHeightPx * 0.6;
    let bestZone: WhitespaceZone | null = null;
    let bestDistance = Infinity;

    for (const zone of zones) {
      const zoneMid = zone.startY + Math.floor(zone.height / 2);

      if (zoneMid <= currentY + sensitivity) continue;
      if (zoneMid < lookbackLimit) continue;
      if (zoneMid > targetY + pageHeightPx * 0.1) continue;

      const distance = Math.abs(zoneMid - targetY);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestZone = zone;
      }
    }

    if (bestZone) {
      const breakY = bestZone.startY + Math.floor(bestZone.height / 2);
      breaks.push({
        y: breakY,
        zoneMidpoint: breakY,
        zoneHeight: bestZone.height,
      });
      currentY = breakY;
    } else {
      // No suitable zone — force break
      breaks.push({
        y: targetY,
        zoneMidpoint: targetY,
        zoneHeight: 0,
      });
      currentY = targetY;
    }
  }

  onProgress?.(`Detected ${breaks.length} page break(s)`);
  return breaks;
}
