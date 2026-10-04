// Shared TypeScript types for the Page Break Detector

export type PageSize = 'A4' | 'LETTER';

export interface PageDimensions {
  /** Width in points (1pt = 1/72 inch) */
  widthPt: number;
  /** Height in points */
  heightPt: number;
}

export const PAGE_SIZES: Record<PageSize, PageDimensions> = {
  A4: { widthPt: 595.28, heightPt: 841.89 },
  LETTER: { widthPt: 612, heightPt: 792 },
};

/** Margin in points applied to output pages */
export const PAGE_MARGIN_PT = 36; // 0.5 inch

export interface BreakPoint {
  /** Y-coordinate on the composite canvas where the break occurs */
  y: number;
  /** The midpoint of the whitespace zone (for display) */
  zoneMidpoint: number;
  /** Height of the whitespace zone that was detected */
  zoneHeight: number;
}

export interface WhitespaceZone {
  /** Start y of the whitespace run */
  startY: number;
  /** End y of the whitespace run */
  endY: number;
  /** Height of the run in pixels */
  height: number;
}

export interface RenderedPage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
  yOffset: number; // Global Y offset in the stitched view
}

export interface RenderResult {
  pages: RenderedPage[];
  width: number;
  height: number;
}

export type ProcessingState =
  | 'idle'
  | 'loading'
  | 'rendering'
  | 'scanning'
  | 'ready'
  | 'composing'
  | 'done'
  | 'error';

export interface AppState {
  processingState: ProcessingState;
  fileName: string | null;
  renderResult: RenderResult | null;
  breakPoints: BreakPoint[];
  pageSize: PageSize;
  sensitivity: number; // min whitespace height in px
  errorMessage: string | null;
}
