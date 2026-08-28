import { useEffect, useRef } from "react";
import { scrollState } from "../lib/state";
import { sound } from "../lib/sound";

/**
 * Instrument-layer details: calibration marks, a live UTC timestamp and
 * coordinate readouts. Reads global state in one rAF loop and writes
 * directly to the DOM.
 */
export function InstrumentLayer() {
  const timeRef = useRef<HTMLSpanElement>(null);
  const coordRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    let lastSec = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const d = new Date();
      const s = d.getUTCSeconds();
      if (s !== lastSec && timeRef.current) {
        lastSec = s;
        timeRef.current.textContent = d.toISOString().slice(11, 19) + " UTC";
      }
      if (coordRef.current) {
        const drift = (scrollState.progress * 0.9 - 0.45).toFixed(4);
        coordRef.current.textContent = `RA ${drift}° · DEC +19.2${Math.abs(Math.round(scrollState.progress * 900))}″`;
      }
      if (altRef.current) {
        altRef.current.textContent = `${(2390 + scrollState.progress * 41200).toLocaleString("en-US", { maximumFractionDigits: 0 })} M`;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="instruments" aria-hidden="true">
      <div className="instruments__mark instruments__mark--tl">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M1 8V1h7" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="instruments__mark instruments__mark--tr">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M18 1h7v7" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="instruments__mark instruments__mark--bl">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M1 18v7h7" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="instruments__mark instruments__mark--br">
        <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
          <path d="M18 25h7v-7" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
      <div className="instruments__line instruments__readout mono-micro">
        <span ref={timeRef}>00:00:00 UTC</span>
        <span ref={coordRef}>RA 0.0000° · DEC +19.20″</span>
        <span ref={altRef}>2,390 M</span>
      </div>
      <div className="instruments__grid mono-micro">CAL 07A · GRID 14/22 · MIRROR SYNC ✓</div>
    </div>
  );
}

/** Metadata panel for the currently hovered orbital body (chapter 03). */
export function OrbitMeta() {
  const ref = useRef<HTMLDivElement>(null);
  const fields = {
    id: useRef<HTMLSpanElement>(null),
    mass: useRef<HTMLSpanElement>(null),
    distance: useRef<HTMLSpanElement>(null),
    klass: useRef<HTMLSpanElement>(null),
    period: useRef<HTMLSpanElement>(null),
  };

  useEffect(() => {
    const apply = () => {
      const h = scrollState.hovered;
      const el = ref.current;
      if (!el) return;
      el.dataset.visible = h ? "true" : "false";
      if (h) {
        fields.id.current!.textContent = h.id;
        fields.mass.current!.textContent = h.mass;
        fields.distance.current!.textContent = h.distance;
        fields.klass.current!.textContent = h.klass;
        fields.period.current!.textContent = h.period;
        sound.blip(520, 0.1, 0.018);
      }
    };
    const id = window.setInterval(apply, 120);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <aside ref={ref} className="orbit-meta mono-micro" data-visible="false" aria-live="polite">
      <div className="orbit-meta__head">
        <span ref={fields.id}>OBJECT 00</span>
        <span className="orbit-meta__lock">TRACKING</span>
      </div>
      <dl>
        <div><dt>MASS</dt><dd ref={fields.mass}>—</dd></div>
        <div><dt>DISTANCE</dt><dd ref={fields.distance}>—</dd></div>
        <div><dt>CLASS</dt><dd ref={fields.klass}>—</dd></div>
        <div><dt>PERIOD</dt><dd ref={fields.period}>—</dd></div>
      </dl>
    </aside>
  );
}
