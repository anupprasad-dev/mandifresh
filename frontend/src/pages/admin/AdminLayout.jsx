import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="dash-shell admin">
      <aside className="dash-side">
        <div className="logo"><span className="logo-mark">🛡️</span><span className="logo-text">Mandi<b>Fresh</b></span></div>
        <p className="store-name">Admin · {user.name}</p>
        <nav>
          <NavLink end to="/admin">📊 Overview</NavLink>
          <NavLink to="/admin/orders">🧾 Orders</NavLink>
          <NavLink to="/admin/products">📦 Products</NavLink>
          <NavLink to="/admin/categories">🏷️ Categories</NavLink>
          <NavLink to="/admin/sellers">🏪 Sellers</NavLink>
          <NavLink to="/admin/customers">👥 Customers</NavLink>
        </nav>
        <button className="btn btn-ghost" onClick={async () => { await logout(); navigate("/admin/login"); }}>↩ Sign out</button>
      </aside>
      <main className="dash-main"><Outlet /></main>
    </div>
  );
}
