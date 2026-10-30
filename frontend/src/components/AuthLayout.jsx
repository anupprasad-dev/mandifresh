import { Link } from "react-router-dom";
import { Logo } from "./Header";

const ART = {
  customer: {
    emojis: ["🥬", "🍅", "🥕", "🍎", "🥛", "🍞"],
    headline: "Fresh groceries,\ndelivered to your door.",
    points: ["Farm-fresh fruits & vegetables", "Free delivery above ₹499", "Pay on delivery, cancel anytime"],
  },
  seller: {
    emojis: ["🏪", "📦", "📈", "🧾", "🌾", "🥭"],
    headline: "Grow your grocery\nbusiness online.",
    points: ["List products in minutes", "Manage stock and orders in one place", "Reach thousands of local shoppers"],
  },
  admin: {
    emojis: ["🛡️", "📊", "👥", "🧾", "🏷️", "⚙️"],
    headline: "MandiFresh\nControl Center.",
    points: ["Authorised administrators only", "All activity is protected by signed tokens", "Sign out when you are done"],
  },
};

export default function AuthLayout({ variant = "customer", title, subtitle, children, footer }) {
  const art = ART[variant];
  return (
    <div className={`auth-split ${variant}`}>
      <aside className="auth-art" aria-hidden={variant === "customer" ? undefined : "true"}>
        <div className="auth-art-inner">
          {variant === "customer" ? (
            <Logo />
          ) : (
            <div className="logo"><span className="logo-mark">{variant === "admin" ? "🛡️" : "🏪"}</span><span className="logo-text">Mandi<b>Fresh</b> <small>{variant === "admin" ? "Admin" : "Seller"}</small></span></div>
          )}
          <h2>{art.headline.split("\n").map((l, i) => <span key={i}>{l}<br /></span>)}</h2>
          <ul>{art.points.map((p) => <li key={p}>✓ {p}</li>)}</ul>
          <div className="auth-emojis">{art.emojis.map((e, i) => <span key={i} style={{ animationDelay: `${i * -0.8}s` }}>{e}</span>)}</div>
        </div>
      </aside>
      <main className="auth-pane">
        <div className="auth-box">
          {variant === "customer" && <Link to="/" className="back-home">← Back to store</Link>}
          <h1>{title}</h1>
          {subtitle && <p className="muted lead">{subtitle}</p>}
          {children}
          {footer && <div className="auth-foot">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
