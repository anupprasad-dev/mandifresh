import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const SLIDES = [
  {
    tag: "Farm fresh • Every morning",
    title: "Fresh fruits & vegetables at your door",
    text: "Handpicked from local farms and delivered within hours. Taste the difference.",
    cta: { label: "Shop fresh produce", to: "/shop?category=vegetables" },
    emojis: ["🥬", "🍅", "🥕", "🍎", "🍌"],
    theme: "s-green",
  },
  {
    tag: "Weekly savings",
    title: "Up to 30% off on daily essentials",
    text: "Stock up on rice, atta, dal and spices at honest prices. New deals every week.",
    cta: { label: "See today's deals", to: "/shop?deals=1" },
    emojis: ["🌾", "🫘", "🌶️", "🧂", "🫙"],
    theme: "s-amber",
  },
  {
    tag: "Dairy & bakery",
    title: "Milk, paneer, eggs and warm bread",
    text: "Your breakfast table, sorted. Cold-chain delivered and always fresh.",
    cta: { label: "Explore dairy & bakery", to: "/shop?category=dairy-eggs" },
    emojis: ["🥛", "🧀", "🥚", "🍞", "🥐"],
    theme: "s-sky",
  },
];

export default function HeroSlider() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);
  const go = useCallback((n) => setI((n + SLIDES.length) % SLIDES.length), []);

  useEffect(() => {
    if (paused) return undefined;
    const t = setInterval(() => setI((c) => (c + 1) % SLIDES.length), 5500);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      <div className="hero-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {SLIDES.map((s, idx) => (
          <div className={`hero-slide ${s.theme}`} key={s.title} aria-hidden={idx !== i}>
            <div className="container hero-inner">
              <div className="hero-copy">
                <span className="hero-tag">{s.tag}</span>
                <h1>{s.title}</h1>
                <p>{s.text}</p>
                <Link to={s.cta.to} className="btn btn-light btn-lg" tabIndex={idx === i ? 0 : -1}>{s.cta.label} →</Link>
              </div>
              <div className="hero-art" aria-hidden="true">
                {s.emojis.map((e, k) => (
                  <span key={k} className={`float f${k}`}>{e}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="hero-arrow left" onClick={() => go(i - 1)} aria-label="Previous slide">‹</button>
      <button className="hero-arrow right" onClick={() => go(i + 1)} aria-label="Next slide">›</button>
      <div className="hero-dots">
        {SLIDES.map((_, idx) => (
          <button key={idx} className={idx === i ? "on" : ""} onClick={() => go(idx)} aria-label={`Go to slide ${idx + 1}`} />
        ))}
      </div>
    </section>
  );
}
