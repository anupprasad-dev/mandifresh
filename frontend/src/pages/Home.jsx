import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import HeroSlider from "../components/HeroSlider";
import ProductCard from "../components/ProductCard";

const PERKS = [
  { icon: "⚡", title: "Fast delivery", text: "Fresh to your door, same day in most areas." },
  { icon: "🥬", title: "Farm fresh quality", text: "Every item is quality-checked before packing." },
  { icon: "💸", title: "Honest prices", text: "Free delivery above ₹499. No hidden charges." },
  { icon: "🔒", title: "Safe & simple", text: "Cash on delivery and easy cancellation." },
];

function Section({ title, to, children }) {
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>{title}</h2>
          {to && <Link to={to} className="link">View all →</Link>}
        </div>
        {children}
      </div>
    </section>
  );
}

function Skeletons({ n = 4 }) {
  return <div className="grid">{Array.from({ length: n }).map((_, i) => <div key={i} className="card skeleton" />)}</div>;
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

      <Section title="Shop by category">
        <div className="cat-grid">
          {(data?.categories || Array.from({ length: 10 })).map((c, i) =>
            c ? (
              <Link key={c.id} to={`/shop?category=${c.slug}`} className="cat-tile">
                <span className="cat-emoji">{c.emoji}</span>
                <span>{c.name}</span>
              </Link>
            ) : (
              <div key={i} className="cat-tile skeleton" />
            )
          )}
        </div>
      </Section>

      {error && (
        <div className="container"><div className="alert">We couldn't load products right now. Please refresh in a moment.</div></div>
      )}

      {!error && (
        <>
          <Section title="Fresh picks for you" to="/shop">
            {data ? <Grid items={data.featured} /> : <Skeletons />}
          </Section>

          <section className="promo">
            <div className="container promo-inner">
              <div>
                <h2>Free delivery on orders above ₹499</h2>
                <p>Fill your basket with fruits, vegetables and monthly staples, and we'll bring it home for free.</p>
              </div>
              <Link to="/shop" className="btn btn-light btn-lg">Start shopping</Link>
            </div>
          </section>

          <Section title="Today's deals" to="/shop?deals=1">
            {data ? <Grid items={data.deals} /> : <Skeletons />}
          </Section>

          <Section title="New arrivals" to="/shop?sort=newest">
            {data ? <Grid items={data.new_arrivals} /> : <Skeletons />}
          </Section>
        </>
      )}

      <section className="section perks">
        <div className="container perk-grid">
          {PERKS.map((p) => (
            <div key={p.title} className="perk">
              <span className="perk-icon">{p.icon}</span>
              <div><h3>{p.title}</h3><p className="muted">{p.text}</p></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function Grid({ items }) {
  if (!items.length) return <p className="muted">Nothing here yet. Check back soon!</p>;
  return <div className="grid">{items.map((p) => <ProductCard key={p.id} product={p} />)}</div>;
}
