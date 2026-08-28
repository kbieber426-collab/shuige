import { useEffect, useRef, useState } from "react";

export interface LoaderStep {
  label: string;
  weight: number;
  run: () => Promise<void>;
}

/**
 * Functional loading sequence — progress is the real weighted sum of
 * completed initialisation steps, eased for display.
 */
export function Loader({
  steps,
  onComplete,
}: {
  steps: LoaderStep[];
  onComplete: () => void;
}) {
  const [display, setDisplay] = useState(0);
  const [stepLabel, setStepLabel] = useState(steps[0]?.label ?? "INITIALIZING");
  const [leaving, setLeaving] = useState(false);
  const target = useRef(0);
  const done = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const total = steps.reduce((a, s) => a + s.weight, 0) || 1;
      let acc = 0;
      const minShow = new Promise((r) => setTimeout(r, 1400));
      for (const step of steps) {
        if (cancelled) return;
        setStepLabel(step.label);
        await step.run();
        acc += step.weight;
        target.current = acc / total;
        if (cancelled) return;
      }
      target.current = 1;
      await minShow;
      if (!cancelled) {
        setLeaving(true);
        setTimeout(() => !cancelled && onComplete(), 1050);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // setInterval instead of rAF: stays accurate even when the tab is throttled
    const id = window.setInterval(() => {
      setDisplay((d) => {
        const next = d + (target.current - d) * (target.current > d ? 0.12 : 0.3);
        return target.current === 1 && next > 0.995 ? 1 : next;
      });
    }, 40);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.round(display * 100);
  const blocks = 18;
  const filled = Math.round(display * blocks);
  const bar = "█".repeat(filled) + "░".repeat(blocks - filled);

  return (
    <div className={`loader ${leaving ? "loader--leaving" : ""}`} role="status" aria-label="Loading NOCTURNE">
      <div className="loader__panel loader__panel--top" />
      <div className="loader__panel loader__panel--bottom" />
      <div className="loader__content">
        <div className="loader__brand mono-micro">DEEP-FIELD RESEARCH INSTITUTE — EST. 2041</div>
        <h1 className="loader__title">NOCTURNE</h1>
        <div className="loader__readout mono-micro">
          <span className="loader__step">{stepLabel}</span>
          <span className="loader__bar">[{bar}]</span>
          <span className="loader__pct">{pct}%</span>
        </div>
        <div className="loader__foot mono-micro">
          <span>LAT 28.2936° / LON -16.5097°</span>
          <span>SIGNAL ACQUISITION IN PROGRESS</span>
        </div>
      </div>
    </div>
  );
}
