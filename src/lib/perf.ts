export type QualityTier = "high" | "medium" | "low";

export interface SceneQuality {
  stars: number;
  deep: number;
  nebula: number;
  orbitBodies: number;
  pixelRatio: number;
  moonSegments: number;
}

const TIERS: Record<QualityTier, SceneQuality> = {
  high: { stars: 6500, deep: 6000, nebula: 900, orbitBodies: 6, pixelRatio: 2, moonSegments: 64 },
  medium: { stars: 3200, deep: 2800, nebula: 450, orbitBodies: 5, pixelRatio: 1.5, moonSegments: 40 },
  low: { stars: 1400, deep: 1100, nebula: 200, orbitBodies: 4, pixelRatio: 1, moonSegments: 28 },
};

export function detectTier(): QualityTier {
  if (typeof window === "undefined") return "medium";
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 768;
  const cores = navigator.hardwareConcurrency ?? 4;
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 8;
  if (coarse || narrow) return "low";
  if (cores <= 4 || mem <= 4) return "medium";
  return "high";
}

export function qualityFor(tier: QualityTier): SceneQuality {
  const q = { ...TIERS[tier] };
  q.pixelRatio = Math.min(window.devicePixelRatio || 1, q.pixelRatio);
  return q;
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** 0 when WebGL is unavailable (with a diagnostic reason for the fallback). */
export function testWebGL(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl2") as WebGLRenderingContext | null) ||
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    if (!gl) return "no-context";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbg) gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return null;
  } catch {
    return "exception";
  }
}
