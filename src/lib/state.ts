// Shared, mutable scroll/pointer state.
// Read every frame by the render loop and the overlay layer (rAF-driven DOM
// writes, never React re-renders) so scrolling stays cheap.

export interface OrbitObjectData {
  id: string;
  mass: string;
  distance: string;
  klass: string;
  period: string;
}

export const scrollState = {
  /** 0..1 across the whole descent */
  progress: 0,
  /** signed scroll velocity (normalised, decays each frame) */
  velocity: 0,
  /** pointer in [-1, 1] viewport space */
  pointerX: 0,
  pointerY: 0,
  /** index of the active chapter 0..4 */
  chapter: 0,
  /** data of the currently hovered orbital body (or null) */
  hovered: null as OrbitObjectData | null,
  /** true once the loader reveal has finished */
  entered: false,
  /** true when WebGL could not be initialised */
  fallback: false,
};

export const CHAPTERS = [
  { id: "01", title: "THE OBSERVATORY" },
  { id: "02", title: "THE SIGNAL" },
  { id: "03", title: "THE ORBIT" },
  { id: "04", title: "THE DEEP FIELD" },
  { id: "05", title: "THE UNKNOWN" },
];

/** Per-chapter windows in global scroll progress. */
export const CHAPTER_RANGE: Array<[number, number]> = [
  [0.06, 0.2],
  [0.24, 0.38],
  [0.42, 0.58],
  [0.62, 0.8],
  [0.84, 1.0],
];

export function chapterAt(p: number): number {
  for (let i = CHAPTER_RANGE.length - 1; i >= 0; i--) {
    if (p >= CHAPTER_RANGE[i][0] - 0.02) return i;
  }
  return 0;
}

/** Smooth 0..1 window with eased in/out edges. */
export function windowFade(
  p: number,
  start: number,
  end: number,
  fadeIn = 0.045,
  fadeOut = 0.045
): number {
  if (p < start - fadeIn || p > end + fadeOut) return 0;
  const a = clamp01((p - (start - fadeIn)) / fadeIn);
  const b = clamp01((end + fadeOut - p) / fadeOut);
  return easeInOut(Math.min(a, b));
}

export function localProgress(p: number, start: number, end: number): number {
  return clamp01((p - start) / (end - start));
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
