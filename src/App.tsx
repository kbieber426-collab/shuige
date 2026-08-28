import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { NocturneScene } from "./three/NocturneScene";
import { FallbackSky } from "./three/FallbackSky";
import { detectTier, qualityFor, prefersReducedMotion, testWebGL } from "./lib/perf";
import { scrollState } from "./lib/state";
import { Loader, type LoaderStep } from "./components/Loader";
import { Cursor } from "./components/Cursor";
import { Nav } from "./components/Nav";
import { Chapters } from "./components/Chapters";
import { InstrumentLayer, OrbitMeta } from "./components/InstrumentLayer";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<NocturneScene | null>(null);  const [ready, setReady] = useState(false);
  const [steps] = useState<LoaderStep[]>(() => buildSteps(mountRef, sceneRef));

  // pointer + scroll wiring (single passive listeners; state is mutable)
  useEffect(() => {
    let lastY = window.scrollY;
    let lastT = performance.now();
    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - lastY;
      const dt = Math.max(1, now - lastT);
      scrollState.velocity = scrollState.velocity * 0.7 + (dy / dt) * 0.3;
      lastY = window.scrollY;
      lastT = now;
    };
    const onPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });

    const st = ScrollTrigger.create({
      trigger: "#scroll-track",
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => {
        scrollState.progress = self.progress;
      },
    });

    // decay scroll velocity each frame
    let raf = 0;
    const decay = () => {
      raf = requestAnimationFrame(decay);
      scrollState.velocity *= 0.92;
    };
    decay();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      st.kill();
      cancelAnimationFrame(raf);
    };
  }, []);

  // magnetic buttons (desktop only, after the UI is revealed)
  useEffect(() => {
    if (!ready || !window.matchMedia("(pointer: fine)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".magnetic"));
    const cleanups = els.map((el) => {
      const onMove = (e: MouseEvent) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.32}px)`;
      };
      const onLeave = () => {
        el.style.transition = "transform 0.45s cubic-bezier(0.2, 1, 0.3, 1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 450);
      };
      el.addEventListener("mousemove", onMove);
      el.addEventListener("mouseleave", onLeave);
      return () => {
        el.removeEventListener("mousemove", onMove);
        el.removeEventListener("mouseleave", onLeave);
      };
    });
    return () => cleanups.forEach((fn) => fn());
  }, [ready]);

  // dispose the WebGL scene when the app unmounts (HMR / route changes)
  useEffect(() => {
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, []);

  const handleEntered = () => {
    setReady(true);
    requestAnimationFrame(() => {
      scrollState.entered = true;
      document.documentElement.classList.add("entered");
      gsap.to(".chapter--hero .hero__title", {
        keyframes: [
          { opacity: 1, letterSpacing: "-0.02em", filter: "blur(0px)", duration: 1.4, ease: "power3.out" },
        ],
        delay: 0.15,
      });
      gsap.fromTo(
        ".chapter--hero .hero__meta, .chapter--hero .hero__sub, .nav, .chapter-indicator, .progress-rail, .instruments",
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 1.1, stagger: 0.06, ease: "power2.out", delay: 0.4, clearProps: "all" }
      );
    });
  };

  return (
    <>
      <div className="stage" ref={mountRef} aria-hidden="true" />
      <Cursor />
      <Nav />
      <InstrumentLayer />
      <OrbitMeta />
      {ready && <Chapters />}
      <main id="scroll-track" className="scroll-track" aria-label="NOCTURNE chapters" />
      <span className="sr-only" aria-live="polite">
        NOCTURNE, The Last Observatory. A five chapter scroll experience.
      </span>
      {!ready && <Loader steps={steps} onComplete={handleEntered} />}
    </>
  );
}

/** Real initialisation steps that feed the loader's progress. */
function buildSteps(
  mountRef: React.MutableRefObject<HTMLDivElement | null>,
  sceneRef: React.MutableRefObject<NocturneScene | null>
): LoaderStep[] {
  const frame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  return [
    {
      label: "DETECTING INSTRUMENT",
      weight: 10,
      run: async () => {
        const err = testWebGL();
        scrollState.fallback = err !== null;
        await frame();
      },
    },
    {
      label: "CALIBRATING OPTICS",
      weight: 20,
      run: async () => {
        const mount = mountRef.current;
        if (!mount) return;
        if (sceneRef.current) {
          await frame();
          return;
        }
        if (scrollState.fallback) {
          new FallbackSky(mount);
          await frame();
          return;
        }
        const tier = detectTier();
        const scene = new NocturneScene();
        scene.init(mount, qualityFor(tier), prefersReducedMotion(), (d) => {
          scrollState.hovered = d;
        });
        sceneRef.current = scene;
        await frame();
      },
    },
    {
      label: "LOADING STAR CATALOGUE",
      weight: 30,
      run: async () => {
        try {
          await Promise.race([
            document.fonts.ready,
            new Promise((r) => setTimeout(r, 3000)),
          ]);
        } catch {
          /* fonts are progressive enhancement */
        }
        await frame();
      },
    },
    {
      label: "FIRST LIGHT",
      weight: 25,
      run: async () => {
        await frame();
        await new Promise((r) => setTimeout(r, 350));
        await frame();
      },
    },
    {
      label: "ALIGNING MIRRORS",
      weight: 15,
      run: async () => {
        await new Promise((r) => setTimeout(r, 250));
        await frame();
      },
    },
  ];
}
