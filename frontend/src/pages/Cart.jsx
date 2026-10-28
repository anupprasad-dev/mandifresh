import { Link, useNavigate } from "react-router-dom";
import ProductImage from "../components/ProductImage";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { FREE_DELIVERY, inr } from "../utils";

export default function Cart() {
  const { lines, subtotal, delivery, total, setQty, remove } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (lines.length === 0) {
    return (
      <div className="container empty">
        <div className="empty-emoji">🛒</div>
        <h2>Your cart is empty</h2>
        <p className="muted">Add some fresh groceries to get started.</p>
        <Link to="/shop" className="btn btn-primary btn-lg">Browse products</Link>
      </div>
    );
  }

  const toFree = Math.max(0, FREE_DELIVERY - subtotal);
  return (
    <div className="container cart">
      <h1>Your cart</h1>
      <div className="cart-grid">
        <div className="card cart-lines">
          {toFree > 0 ? (
            <div className="free-bar">Add <b>{inr(toFree)}</b> more for free delivery
              <div className="bar"><i style={{ width: `${Math.min(100, (subtotal / FREE_DELIVERY) * 100)}%` }} /></div>
            </div>
          ) : <div className="free-bar done">🎉 You've unlocked free delivery!</div>}
          {lines.map((l) => (
            <div className="cart-line" key={l.id}>
              <ProductImage product={l} size="sm" />
              <div className="cl-info">
                <Link to={`/product/${l.slug}`}>{l.name}</Link>
                <span className="muted">{l.unit} • {inr(l.price)}</span>
              </div>
              <div className="stepper">
                <button onClick={() => setQty(l.id, l.qty - 1)} aria-label="Decrease">−</button>
                <span>{l.qty}</span>
                <button onClick={() => setQty(l.id, l.qty + 1)} disabled={l.qty >= l.stock} aria-label="Increase">+</button>
              </div>
              <strong className="cl-total">{inr(l.price * l.qty)}</strong>
              <button className="icon-btn" onClick={() => remove(l.id)} aria-label={`Remove ${l.name}`}>✕</button>
            </div>
          ))}
        </div>
        <aside className="card summary">
          <h3>Order summary</h3>
          <div className="row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="row"><span>Delivery</span><span>{delivery ? inr(delivery) : "Free"}</span></div>
          <div className="row total"><span>Total</span><span>{inr(total)}</span></div>
          <button className="btn btn-primary btn-lg block" onClick={() => navigate(user ? "/checkout" : "/login", { state: { from: "/checkout" } })}>
            {user ? "Proceed to checkout" : "Login to checkout"}
          </button>
          <p className="muted small">Payment: Cash on delivery</p>
        </aside>
      </div>
    </div>
  );
}
