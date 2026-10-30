import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

const SLIDES = [
  {
    tag: "🌿 Farm fresh · Every morning",
    title: "Fresh fruits & vegetables, straight to your door",
    text: "Handpicked from local farms and delivered within hours, so every bite tastes like it was just picked.",
    cta: { label: "Shop fresh produce", to: "/shop?category=vegetables" },
    ghost: { label: "Browse fruits", to: "/shop?category=fruits" },
    plate: ["🥬", "🍅", "🥕", "🍎", "🍌", "🥦"],
    chips: ["Free delivery ₹499+", "Quality checked"],
    theme: "s-green",
  },
  {
    tag: "💸 Weekly savings",
    title: "Up to 30% off on your daily essentials",
    text: "Stock up on rice, atta, dal and spices at honest prices. New deals land every week.",
    cta: { label: "See today's deals", to: "/shop?deals=1" },
    ghost: { label: "Pantry staples", to: "/shop?category=rice-atta-dal" },
    plate: ["🌾", "🫘", "🌶️", "🧂", "🥜", "🍵"],
    chips: ["Honest prices", "Pay on delivery"],
    theme: "s-amber",
  },
  {
    tag: "🥛 Dairy & bakery",
    title: "Milk, paneer, eggs and warm bread for breakfast",
    text: "Your breakfast table, sorted. Delivered cold, fresh and on time.",
    cta: { label: "Explore dairy & bakery", to: "/shop?category=dairy-eggs" },
    ghost: { label: "Bakery", to: "/shop?category=bakery" },
    plate: ["🥛", "🧀", "🥚", "🍞", "🥐", "🧈"],
    chips: ["Cold-chain fresh", "Easy cancellation"],
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
    const t = setInterval(() => setI((c) => (c + 1) % SLIDES.length), 6000);
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
          <div className={`hero-slide ${s.theme} ${idx === i ? "active" : ""}`} key={s.title} aria-hidden={idx !== i}>
            <span className="blob b1" /><span className="blob b2" />
            <div className="container hero-inner">
              <div className="hero-copy">
                <span className="hero-tag">{s.tag}</span>
                <h1>{s.title}</h1>
                <p>{s.text}</p>
                <div className="hero-cta">
                  <Link to={s.cta.to} className="btn btn-light btn-lg" tabIndex={idx === i ? 0 : -1}>{s.cta.label} →</Link>
                  <Link to={s.ghost.to} className="btn btn-glass btn-lg" tabIndex={idx === i ? 0 : -1}>{s.ghost.label}</Link>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="plate">
                  {s.plate.map((e, k) => <span key={k} className={`float f${k}`}>{e}</span>)}
                </div>
                <span className="hero-chip c1">✓ {s.chips[0]}</span>
                <span className="hero-chip c2">★ {s.chips[1]}</span>
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
