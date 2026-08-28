import { useEffect, useRef } from "react";

/**
 * Custom cursor: a small dot with a trailing ring that lerps toward the
 * pointer. Expands over interactive elements and shows contextual labels
 * from [data-cursor]. Desktop / fine-pointer only.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("has-custom-cursor");

    const dot = dotRef.current!;
    const ring = ringRef.current!;
    const label = labelRef.current!;
    let mx = -100, my = -100, rx = -100, ry = -100;
    let hovered = false;
    let pressed = false;
    let visible = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (!visible) {
        visible = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
      const target = (e.target as HTMLElement | null)?.closest(
        "a, button, [data-cursor]"
      ) as HTMLElement | null;
      const active = !!target;
      const text = target?.dataset.cursor ?? (target?.tagName === "A" || target?.tagName === "BUTTON" ? "ENTER" : "");
      if (active !== hovered || label.textContent !== (text || "")) {
        hovered = active;
        ring.dataset.state = active ? "active" : "default";
        label.textContent = text || "";
        dot.dataset.hidden = active ? "true" : "false";
        if (text) {
          import("../lib/sound").then(({ sound }) => sound.blip(1200, 0.05, 0.012));
        }
      }
    };
    const onDown = () => {
      pressed = true;
      ring.dataset.pressed = "true";
    };
    const onUp = () => {
      pressed = false;
      delete ring.dataset.pressed;
    };
    const onLeave = () => {
      visible = false;
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const tick = () => {
      raf = requestAnimationFrame(tick);
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      dot.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%) scale(${pressed ? 0.85 : 1})`;
    };
    tick();

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      document.documentElement.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className="cursor-root" aria-hidden="true">
      <div ref={dotRef} className="cursor-dot" />
      <div ref={ringRef} className="cursor-ring" data-state="default">
        <span ref={labelRef} className="cursor-label" />
      </div>
    </div>
  );
}
