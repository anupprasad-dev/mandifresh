import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api";
import { Spinner } from "../../components/Guards";
import { STATUS_LABEL, dateShort, dateTime, inr } from "../../utils";

export default function AdminDashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    document.title = "Overview - Admin";
    api.get("/admin/stats/").then((r) => setS(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  if (error) return <div className="alert">{error}</div>;
  if (!s) return <Spinner />;

  const max = Math.max(1, ...s.sales_last_7_days.map((d) => Number(d.revenue)));
  const tiles = [
    { label: "Revenue", value: inr(s.orders.revenue), sub: "excluding cancelled items", icon: "💰" },
    { label: "Orders", value: s.orders.total, sub: "all time", icon: "🧾" },
    { label: "Customers", value: s.users.customers, sub: "registered", icon: "👥" },
    { label: "Sellers", value: s.users.sellers, sub: `${s.users.pending_sellers} awaiting approval`, icon: "🏪", warn: s.users.pending_sellers > 0 },
    { label: "Products", value: s.products.active, sub: `${s.products.total} total · ${s.products.out_of_stock} out of stock`, icon: "📦" },
  ];

  return (
    <>
      <div className="page-head"><h1>Overview</h1></div>
      {s.users.pending_sellers > 0 && (
        <div className="notice warn">
          <b>{s.users.pending_sellers} seller{s.users.pending_sellers > 1 ? "s are" : " is"} waiting for approval.</b>{" "}
          <Link to="/admin/sellers?pending=1" className="link">Review now →</Link>
        </div>
      )}
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`card tile ${t.warn ? "warn" : ""}`}>
            <span className="tile-ico">{t.icon}</span>
            <span className="muted">{t.label}</span><strong>{t.value}</strong><small className="muted">{t.sub}</small>
          </div>
        ))}
      </div>

      <div className="two-col">
        <div className="card pad">
          <h3>Sales, last 7 days</h3>
          <div className="bars" role="img" aria-label="Revenue per day for the last 7 days">
            {s.sales_last_7_days.map((d) => (
              <div key={d.date} className="bar-col" title={`${dateShort(d.date)}: ${inr(d.revenue)} · ${d.orders} orders`}>
                <span className="bar-val">{Number(d.revenue) > 0 ? inr(d.revenue).replace(".00", "") : ""}</span>
                <div className="bar-fill" style={{ height: `${Math.max(3, (Number(d.revenue) / max) * 100)}%` }} />
                <span className="bar-label">{dateShort(d.date)}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card pad">
          <h3>Order items by status</h3>
          <div className="pipeline compact">
            {["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((k) => (
              <Link to={`/admin/orders?status=${k}`} key={k} className={`pill-count ${k}`}>
                <b>{s.status_counts[k] || 0}</b><span>{STATUS_LABEL[k]}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="card table-wrap spaced">
        <div className="pad-h"><h3>Recent orders</h3><Link to="/admin/orders" className="link">All orders →</Link></div>
        <table className="table">
          <thead><tr><th>Order</th><th>Customer</th><th>Placed</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {s.recent_orders.length === 0 && <tr><td colSpan={5} className="muted center">No orders yet.</td></tr>}
            {s.recent_orders.map((o) => (
              <tr key={o.id}>
                <td><b>#{o.id}</b></td><td>{o.full_name}<br /><span className="muted small">{o.customer_email}</span></td>
                <td>{dateTime(o.created_at)}</td><td>{inr(o.total)}</td>
                <td><span className={`pill ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
