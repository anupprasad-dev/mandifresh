import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api";
import { Spinner } from "../components/Guards";
import ProductImage from "../components/ProductImage";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { inr } from "../utils";

export default function ProductDetail() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  const [state, setState] = useState("loading");
  const [qty, setQty] = useState(1);
  const { add } = useCart();
  const toast = useToast();

  useEffect(() => {
    setState("loading");
    setQty(1);
    api.get(`/products/${slug}/`)
      .then((r) => { setP(r.data); setState("ok"); document.title = `${r.data.name} - MandiFresh`; })
      .catch((e) => setState(e.response?.status === 404 ? "missing" : "error"));
  }, [slug]);

  if (state === "loading") return <Spinner />;
  if (state !== "ok") {
    return (
      <div className="container empty">
        <div className="empty-emoji">🥲</div>
        <h2>{state === "missing" ? "Product not found" : "Something went wrong"}</h2>
        <Link to="/shop" className="btn btn-primary">Back to shop</Link>
      </div>
    );
  }

  const max = Math.min(p.stock, 20);
  return (
    <div className="container detail">
      <nav className="crumbs"><Link to="/">Home</Link> / <Link to={`/shop?category=${p.category.slug}`}>{p.category.name}</Link> / {p.name}</nav>
      <div className="detail-grid">
        <div className="card detail-media"><ProductImage product={p} size="lg" /></div>
        <div>
          <span className="pc-cat">{p.category.name}</span>
          <h1>{p.name}</h1>
          <p className="muted">{p.unit}{p.store_name ? ` • Sold by ${p.store_name}` : ""}</p>
          <div className="detail-price">
            <strong>{inr(p.price)}</strong>
            {p.discount_percent > 0 && (<><s>{inr(p.mrp)}</s><span className="badge-off static">{p.discount_percent}% OFF</span></>)}
          </div>
          <p className={p.in_stock ? "ok-text" : "err"}>
            {p.in_stock ? (p.stock <= 5 ? `Only ${p.stock} left` : "In stock") : "Currently out of stock"}
          </p>
          {p.description && <p>{p.description}</p>}
          {p.in_stock && (
            <div className="buy-row">
              <div className="stepper">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <span>{qty}</span>
                <button onClick={() => setQty((q) => Math.min(max, q + 1))} aria-label="Increase">+</button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={() => { add(p, qty); toast(`${qty} × ${p.name} added to cart`); }}>
                Add to cart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
