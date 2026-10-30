import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

export const BRAND = "MandiFresh";

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label={`${BRAND} home`}>
      <span className="logo-mark">🥬</span>
      <span className="logo-text">Mandi<b>Fresh</b></span>
    </Link>
  );
}

export default function Header() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
  };

  return (
    <>
      <div className="topbar">
        <div className="container topbar-row">
          <span>🚚 Free delivery on orders above ₹499</span>
          <span className="hide-sm">💵 Cash on delivery · Easy cancellation</span>
        </div>
      </div>
      <header className="header">
        <div className="container header-row">
          <Logo />
          <form className="search" onSubmit={submit} role="search">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search vegetables, dal, milk, spices…" aria-label="Search products" />
            <button type="submit" aria-label="Search">Search</button>
          </form>
          <nav className="nav">
            <NavLink to="/shop" className="nav-link hide-sm">Shop</NavLink>
            <Link to="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
              <span className="cart-ico">🛒</span><span className="hide-sm">Cart</span>
              {count > 0 && <span className="cart-count">{count}</span>}
            </Link>
            {user ? (
              <div className="user-menu" ref={menuRef}>
                <button className="btn btn-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                  <span className="avatar">{user.name?.[0]?.toUpperCase()}</span>
                  <span className="hide-sm">{user.name.split(" ")[0]}</span> ▾
                </button>
                {open && (
                  <div className="menu" onClick={() => setOpen(false)}>
                    {user.role === "seller" && <Link to="/seller">Seller dashboard</Link>}
                    {user.role === "admin" && <Link to="/admin">Admin panel</Link>}
                    {user.role === "customer" && (<><Link to="/orders">My orders</Link><Link to="/account">My account</Link></>)}
                    <button onClick={async () => { await logout(); navigate("/"); }}>Sign out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-primary">Login</Link>
            )}
          </nav>
        </div>
      </header>
    </>
  );
}
