// Coherent 2D fallback when WebGL is unavailable: a quiet layered starfield
// on a 2D canvas, drifting very slowly. Depth is suggested through parallax
// layers with different speeds and brightness.

export class FallbackSky {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private layers: Array<{ x: number; y: number; r: number; a: number; speed: number; tw: number }> = [];
  private rafId = 0;
  private disposed = false;
  private t = 0;
  private last = performance.now();

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;
    this.resize();
    window.addEventListener("resize", this.resize);
    const count = window.innerWidth < 768 ? 220 : 480;
    for (let i = 0; i < count; i++) {
      const depth = Math.random();
      this.layers.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.3 + depth * 1.4,
        a: 0.12 + depth * 0.65,
        speed: 0.0004 + depth * 0.0022,
        tw: Math.random() * Math.PI * 2,
      });
    }
    this.loop();
  }

  private resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private loop = () => {
    if (this.disposed) return;
    this.rafId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min(now - this.last, 50);
    this.last = now;
    this.t += dt;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.ctx.fillStyle = "#050507";
    this.ctx.fillRect(0, 0, w, h);
    for (const s of this.layers) {
      s.x -= s.speed * dt * 0.06;
      if (s.x < -0.02) s.x = 1.02;
      const tw = 0.75 + 0.25 * Math.sin(this.t * 0.001 + s.tw);
      this.ctx.globalAlpha = s.a * tw;
      this.ctx.fillStyle = "#c9cfda";
      this.ctx.beginPath();
      this.ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener("resize", this.resize);
    this.canvas.remove();
  }
}
