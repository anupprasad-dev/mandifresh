import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import HeroSlider from "../components/HeroSlider";
import ProductCard from "../components/ProductCard";
import { hueOf } from "../utils";

const PERKS = [
  { icon: "⚡", title: "Fast delivery", text: "Same-day in most areas" },
  { icon: "🥬", title: "Farm fresh", text: "Quality-checked every item" },
  { icon: "💸", title: "Honest prices", text: "Free delivery above ₹499" },
  { icon: "↩️", title: "Easy cancellation", text: "Cancel before we pack it" },
];

const STEPS = [
  { n: "1", icon: "🔎", title: "Pick your groceries", text: "Search or browse fresh produce, dairy, staples and more." },
  { n: "2", icon: "🛒", title: "Checkout in a minute", text: "Add your address and choose cash on delivery." },
  { n: "3", icon: "🚚", title: "Get it delivered", text: "Track every item's status from your orders page." },
];

function Section({ title, subtitle, to, children, tone }) {
  return (
    <section className={`section ${tone || ""}`}>
      <div className="container">
        <div className="section-head">
          <div><h2>{title}</h2>{subtitle && <p className="muted">{subtitle}</p>}</div>
          {to && <Link to={to} className="link">View all →</Link>}
        </div>
        {children}
      </div>
    </section>
  );
}

const Skeletons = ({ n = 4 }) => (
  <div className="grid">{Array.from({ length: n }).map((_, i) => <div key={i} className="card skeleton" />)}</div>
);

function Grid({ items }) {
  if (!items.length) return <p className="muted">Nothing here yet. Check back soon!</p>;
  return <div className="grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>;
}

export default function Home() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    document.title = "MandiFresh - Fresh groceries, delivered";
    api.get("/home/").then((r) => setData(r.data)).catch(() => setError(true));
  }, []);

  return (
    <>
      <HeroSlider />

      <div className="container perk-strip">
        {PERKS.map((p) => (
          <div key={p.title} className="perk">
            <span className="perk-icon">{p.icon}</span>
            <div><h3>{p.title}</h3><p className="muted">{p.text}</p></div>
          </div>
        ))}
      </div>

      <Section title="Shop by category" subtitle="Everything your kitchen needs, in one place">
        <div className="cat-grid">
          {(data?.categories || Array.from({ length: 10 })).map((c, i) =>
            c ? (
              <Link key={c.id} to={`/shop?category=${c.slug}`} className="cat-tile" style={{ "--h": hueOf(c.name) }}>
                <span className="cat-emoji">{c.emoji}</span>
                <span>{c.name}</span>
              </Link>
            ) : (
              <div key={i} className="cat-tile skeleton" />
            )
          )}
        </div>
      </Section>

      {error && <div className="container"><div className="alert">We couldn't load products right now. Please refresh in a moment.</div></div>}

      {!error && (
        <>
          <Section title="Fresh picks for you" subtitle="Hand-selected favourites" to="/shop">
            {data ? <Grid items={data.featured} /> : <Skeletons />}
          </Section>

          <div className="container promo-pair">
            <Link to="/shop?category=vegetables" className="promo-card pc-green">
              <div><span className="eyebrow">Daily fresh</span><h3>Garden-fresh vegetables</h3><p>Picked this morning. Delivered today.</p><span className="btn btn-light">Shop vegetables →</span></div>
              <span className="promo-emoji">🥦🍅</span>
            </Link>
            <Link to="/shop?category=rice-atta-dal" className="promo-card pc-amber">
              <div><span className="eyebrow">Monthly stock-up</span><h3>Atta, rice & dal combos</h3><p>Best value staples for your pantry.</p><span className="btn btn-light">Shop staples →</span></div>
              <span className="promo-emoji">🌾🫘</span>
            </Link>
          </div>

          <Section title="Today's deals" subtitle="Limited-time savings" to="/shop?deals=1" tone="tint">
            {data ? <Grid items={data.deals} /> : <Skeletons />}
          </Section>

          <Section title="How it works" subtitle="Groceries in three easy steps">
            <div className="steps">
              {STEPS.map((s) => (
                <div key={s.n} className="step card">
                  <span className="step-n">{s.n}</span>
                  <span className="step-icon">{s.icon}</span>
                  <h3>{s.title}</h3>
                  <p className="muted">{s.text}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section title="New arrivals" subtitle="Just added to the shelves" to="/shop?sort=newest">
            {data ? <Grid items={data.new_arrivals} /> : <Skeletons />}
          </Section>
        </>
      )}

      <section className="promo">
        <div className="container promo-inner">
          <div>
            <h2>Free delivery on orders above ₹499</h2>
            <p>Fill your basket with fruits, vegetables and monthly staples, and we'll bring it home for free.</p>
          </div>
          <Link to="/shop" className="btn btn-light btn-lg">Start shopping →</Link>
        </div>
      </section>
    </>
  );
}
