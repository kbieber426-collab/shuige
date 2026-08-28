import { useEffect, useRef } from "react";
import { scrollState, windowFade, localProgress, CHAPTER_RANGE } from "../lib/state";
import { scrollToProgress } from "./Nav";

const fmt = new Intl.NumberFormat("en-US");

/** smoothstep 0..1 for DOM-side fades */
function smoothStep(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/**
 * The narrative layer. One fixed, full-viewport stage per chapter; opacity
 * and motion are derived from global scroll progress each frame. Everything
 * is pointer-events: none except explicitly interactive elements.
 */
export function Chapters() {
  const root = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const heroTitle = useRef<HTMLHeadingElement>(null);
  const ch1 = useRef<HTMLDivElement>(null);
  const ch1Lines = useRef<HTMLDivElement>(null);
  const ch2 = useRef<HTMLDivElement>(null);
  const ch2Statement = useRef<HTMLDivElement>(null);
  const ch3 = useRef<HTMLDivElement>(null);
  const ch4 = useRef<HTMLDivElement>(null);
  const ch4Count = useRef<HTMLDivElement>(null);
  const ch4CountNum = useRef<HTMLSpanElement>(null);
  const ch4End = useRef<HTMLDivElement>(null);
  const ch5 = useRef<HTMLDivElement>(null);
  const ch5Lines = useRef<HTMLDivElement>(null);
  const ch5End = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const setStyle = (el: HTMLElement | null, o: number, y = 0) => {
      if (!el) return;
      el.style.opacity = o.toFixed(3);
      el.style.transform = y ? `translate3d(0, ${y.toFixed(1)}px, 0)` : "";
      el.style.visibility = o <= 0.004 ? "hidden" : "visible";
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (!scrollState.entered) return;
      const p = scrollState.progress;

      // ---- HERO ----
      const heroFade = windowFade(p, -0.12, 0.05, 0.001, 0.055);
      setStyle(hero.current, heroFade, -p * 1400);
      if (heroTitle.current) {
        heroTitle.current.style.letterSpacing = `${-0.03 + p * 1.2}em`;
      }

      // ---- CH 01 · THE OBSERVATORY ----
      const [a1, b1] = CHAPTER_RANGE[0];
      const f1 = windowFade(p, a1, b1);
      setStyle(ch1.current, f1);
      if (ch1Lines.current && f1 > 0) {
        const l = localProgress(p, a1, b1);
        const lines = ch1Lines.current.children;
        for (let i = 0; i < lines.length; i++) {
          const start = 0.08 + i * 0.16;
          const t = Math.min(1, Math.max(0, (l - start) / 0.22));
          const el = lines[i] as HTMLElement;
          el.style.opacity = t.toFixed(3);
          el.style.transform = `translate3d(0, ${(1 - t) * 60}px, 0)`;
        }
      }

      // ---- CH 02 · THE SIGNAL ----
      const [a2, b2] = CHAPTER_RANGE[1];
      const f2 = windowFade(p, a2, b2);
      setStyle(ch2.current, f2);
      if (ch2Statement.current && f2 > 0) {
        const l = localProgress(p, a2, b2);
        const t = Math.min(1, Math.max(0, (l - 0.18) / 0.3));
        ch2Statement.current.style.opacity = t.toFixed(3);
        ch2Statement.current.style.transform = `translate3d(0, ${(1 - t) * 48}px, 0)`;
        const rows = ch2.current!.querySelectorAll<HTMLElement>(".signal-meta__row");
        rows.forEach((row, i) => {
          const rt = Math.min(1, Math.max(0, (l - 0.04 - i * 0.05) / 0.16));
          row.style.opacity = rt.toFixed(3);
          row.style.transform = `translate3d(${(1 - rt) * -24}px, 0, 0)`;
        });
      }

      // ---- CH 03 · THE ORBIT ----
      const [a3, b3] = CHAPTER_RANGE[2];
      const f3 = windowFade(p, a3, b3);
      setStyle(ch3.current, f3, (1 - f3) * -30);

      // ---- CH 04 · THE DEEP FIELD ----
      const [a4, b4] = CHAPTER_RANGE[3];
      const f4 = windowFade(p, a4, b4);
      setStyle(ch4.current, f4);
      if (ch4Count.current && f4 > 0) {
        const l = localProgress(p, a4 + 0.02, a4 + 0.1);
        const n = Math.round(l * 13_800_000_000);
        if (ch4CountNum.current) ch4CountNum.current.textContent = fmt.format(n);
        const countOut = 1 - smoothStep(localProgress(p, a4 + 0.085, a4 + 0.125));
        ch4Count.current.style.opacity = countOut.toFixed(3);
        ch4Count.current.style.visibility = countOut <= 0.004 ? "hidden" : "visible";
        const scale = 0.92 + l * 0.16;
        ch4Count.current.style.transform = `scale(${scale.toFixed(3)})`;
      }
      if (ch4End.current && f4 > 0) {
        const t = Math.min(1, Math.max(0, (localProgress(p, a4, b4) - 0.52) / 0.22));
        ch4End.current.style.opacity = t.toFixed(3);
        ch4End.current.style.transform = `translate3d(0, ${(1 - t) * 56}px, 0)`;
      }

      // ---- CH 05 · THE UNKNOWN ----
      const [a5, b5] = CHAPTER_RANGE[4];
      const f5 = windowFade(p, a5, b5);
      setStyle(ch5.current, f5);
      if (ch5Lines.current && f5 > 0) {
        const l = localProgress(p, a5 + 0.01, a5 + 0.07);
        const linesOut = 1 - smoothStep(localProgress(p, a5 + 0.055, a5 + 0.075));
        ch5Lines.current.style.opacity = linesOut.toFixed(3);
        ch5Lines.current.style.visibility = linesOut <= 0.004 ? "hidden" : "visible";
        const lines = ch5Lines.current.children;
        for (let i = 0; i < lines.length; i++) {
          const t = Math.min(1, Math.max(0, (l - i * 0.14) / 0.24));
          const el = lines[i] as HTMLElement;
          el.style.opacity = t.toFixed(3);
          el.style.transform = `translate3d(0, ${(1 - t) * 40}px, 0)`;
          el.style.filter = `blur(${((1 - t) * 8).toFixed(1)}px)`;
        }
      }
      if (ch5End.current && f5 > 0) {
        const t = Math.min(1, Math.max(0, (localProgress(p, a5, b5) - 0.55) / 0.2));
        ch5End.current.style.opacity = t.toFixed(3);
        ch5End.current.style.transform = `translate3d(0, ${(1 - t) * 30}px, 0)`;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={root} className="chapters">
      {/* HERO */}
      <section ref={hero} className="chapter chapter--hero" aria-label="NOCTURNE — The Last Observatory">
        <div className="hero__meta mono-micro">
          <span>01 / 05</span>
          <span>N 28.2936° · W 16.5097°</span>
        </div>
        <h1 ref={heroTitle} className="hero__title">NOCTURNE</h1>
        <div className="hero__sub">
          <span className="hero__tagline">THE LAST OBSERVATORY</span>
          <span className="mono-micro hero__scroll">
            SCROLL TO DESCEND
            <i className="hero__scroll-line" />
          </span>
        </div>
      </section>

      {/* CH 01 */}
      <section ref={ch1} className="chapter chapter--1" aria-label="Chapter 01 — The Observatory">
        <div ref={ch1Lines} className="ch1__statement display">
          <span>EVERYTHING WE KNOW</span>
          <span>BEGAN WITH A</span>
          <span className="ch1__accent">SINGLE POINT OF LIGHT.</span>
        </div>
        <aside className="ch1__panel mono-micro" aria-label="Observatory coordinates">
          <div className="ch1__panel-head">OBSERVATORY</div>
          <dl>
            <div><dt>LAT</dt><dd>28.2936°</dd></div>
            <div><dt>LON</dt><dd>-16.5097°</dd></div>
            <div><dt>ALT</dt><dd>2,390 M</dd></div>
            <div><dt>STATUS</dt><dd className="ch1__status">ACTIVE</dd></div>
          </dl>
        </aside>
      </section>

      {/* CH 02 */}
      <section ref={ch2} className="chapter chapter--2" aria-label="Chapter 02 — The Signal">
        <div className="signal-meta mono-micro">
          <div className="signal-meta__row signal-meta__head">INCOMING TRANSMISSION</div>
          <div className="signal-meta__row"><span>SIGNAL</span><span>07A</span></div>
          <div className="signal-meta__row"><span>FREQUENCY</span><span>1420 MHz</span></div>
          <div className="signal-meta__row"><span>SOURCE</span><span className="signal-meta__warn">UNKNOWN</span></div>
          <div className="signal-meta__row"><span>CONFIDENCE</span><span>98.2%</span></div>
        </div>
        <div ref={ch2Statement} className="ch2__statement display">
          WE LISTEN<br />BEFORE WE<br />UNDERSTAND.
        </div>
        <div className="ch2__hint mono-micro">MOVE POINTER TO MODULATE WAVEFORM</div>
      </section>

      {/* CH 03 */}
      <section ref={ch3} className="chapter chapter--3" aria-label="Chapter 03 — The Orbit">
        <div className="ch3__head">
          <span className="mono-micro">03 / 05 — SYSTEM SURVEY</span>
          <h2 className="ch3__title display-sm">THE ORBIT</h2>
          <p className="ch3__sub mono-micro">HOVER A BODY TO HOLD AND IDENTIFY</p>
        </div>
      </section>

      {/* CH 04 */}
      <section ref={ch4} className="chapter chapter--4" aria-label="Chapter 04 — The Deep Field">
        <div ref={ch4Count} className="ch4__count">
          <span ref={ch4CountNum} className="ch4__number">0</span>
          <span className="ch4__unit mono-micro">YEARS OF LIGHT</span>
        </div>
        <div ref={ch4End} className="ch4__end display">
          AND WE ARE<br />STILL LOOKING.
        </div>
      </section>

      {/* CH 05 */}
      <section ref={ch5} className="chapter chapter--5" aria-label="Chapter 05 — The Unknown">
        <div ref={ch5Lines} className="ch5__lines display">
          <span>THERE IS</span>
          <span>MORE</span>
          <span>BEYOND</span>
          <span>THE SIGNAL.</span>
        </div>
        <div ref={ch5End} className="ch5__end">
          <div className="ch5__brand">NOCTURNE</div>
          <div className="mono-micro ch5__tag">THE LAST OBSERVATORY</div>
          <button
            className="btn-archive magnetic"
            data-cursor="ENTER"
            onClick={() => scrollToProgress(0.999)}
          >
            [ ENTER THE ARCHIVE ]
          </button>
        </div>
      </section>
    </div>
  );
}
