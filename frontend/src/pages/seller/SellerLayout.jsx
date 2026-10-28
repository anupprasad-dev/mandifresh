import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function SellerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="seller-shell">
      <aside className="seller-side">
        <div className="logo"><span className="logo-mark">🏪</span><span className="logo-text">Mandi<b>Fresh</b></span></div>
        <p className="store-name">{user.store_name}</p>
        <nav>
          <NavLink end to="/seller">📊 Dashboard</NavLink>
          <NavLink to="/seller/products">📦 Products</NavLink>
          <NavLink to="/seller/orders">🧾 Orders</NavLink>
        </nav>
        <button className="btn btn-ghost" onClick={async () => { await logout(); navigate("/seller/login"); }}>Sign out</button>
      </aside>
      <main className="seller-main"><Outlet /></main>
    </div>
  );
}
