import { useEffect, useRef, useState } from "react";
import { scrollState, chapterAt, CHAPTERS } from "../lib/state";
import { sound } from "../lib/sound";

export function scrollToProgress(p: number) {
  const max = document.documentElement.scrollHeight - window.innerHeight;
  window.scrollTo({ top: p * max, behavior: "smooth" });
}

export function Nav() {
  const chapterRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLSpanElement>(null);
  const railFill = useRef<HTMLDivElement>(null);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    let raf = 0;
    let lastChapter = -1;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const c = chapterAt(scrollState.progress);
      scrollState.chapter = c;
      if (railFill.current) railFill.current.style.transform = `scaleY(${scrollState.progress})`;
      if (c !== lastChapter) {
        lastChapter = c;
        if (chapterRef.current) chapterRef.current.textContent = `0${c + 1} / 05`;
        if (titleRef.current) titleRef.current.textContent = CHAPTERS[c].title;
      }
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    if (next) {
      sound.enable();
      sound.blip(660, 0.12, 0.03);
    } else {
      sound.disable();
    }
  };

  return (
    <>
      <header className="nav">
        <a
          className="nav__brand"
          href="#top"
          data-cursor="TOP"
          onClick={(e) => {
            e.preventDefault();
            scrollToProgress(0);
          }}
        >
          NOCTURNE<sup>®</sup>
        </a>
        <nav className="nav__links" aria-label="Primary">
          <button data-cursor="OPEN" onClick={() => scrollToProgress(0.9)}>ARCHIVE</button>
          <button data-cursor="VIEW" onClick={() => scrollToProgress(0.12)}>MISSION</button>
          <button data-cursor="SIGNAL" onClick={() => scrollToProgress(0.31)}>CONTACT</button>
          <button
            className="nav__sound"
            data-cursor={soundOn ? "MUTE" : "LISTEN"}
            onClick={toggleSound}
            aria-pressed={soundOn}
          >
            SOUND {soundOn ? "ON" : "OFF"}
          </button>
        </nav>
      </header>

      <div className="chapter-indicator mono-micro" aria-hidden="true">
        <span ref={chapterRef}>01 / 05</span>
        <span ref={titleRef} className="chapter-indicator__title">THE OBSERVATORY</span>
      </div>

      <div className="progress-rail" aria-hidden="true">
        <div className="progress-rail__track">
          <div ref={railFill} className="progress-rail__fill" />
        </div>
        {CHAPTERS.map((c, i) => (
          <button
            key={c.id}
            className="progress-rail__tick"
            data-cursor="GO"
            aria-label={`Chapter ${c.id} — ${c.title}`}
            onClick={() => scrollToProgress([0.02, 0.27, 0.46, 0.66, 0.9][i])}
          />
        ))}
      </div>
    </>
  );
}
