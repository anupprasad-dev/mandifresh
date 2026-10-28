import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api";
import { Spinner } from "../../components/Guards";
import { STATUS_LABEL, inr } from "../../utils";

export default function SellerDashboard() {
  const [s, setS] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    document.title = "Seller dashboard - MandiFresh";
    api.get("/seller/stats/").then((r) => setS(r.data)).catch((e) => setError(errorMessage(e)));
  }, []);
  if (error) return <div className="alert">{error}</div>;
  if (!s) return <Spinner />;

  const tiles = [
    { label: "Revenue", value: inr(s.revenue), sub: "excluding cancelled" },
    { label: "Orders", value: s.orders, sub: `${s.pending} awaiting confirmation` },
    { label: "Active products", value: s.active_products, sub: `${s.products} total` },
    { label: "Low stock", value: s.low_stock, sub: "5 or fewer left", warn: s.low_stock > 0 },
  ];
  return (
    <>
      <div className="page-head"><h1>Dashboard</h1><Link to="/seller/products/new" className="btn btn-primary">+ Add product</Link></div>
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className={`card tile ${t.warn ? "warn" : ""}`}>
            <span className="muted">{t.label}</span><strong>{t.value}</strong><small className="muted">{t.sub}</small>
          </div>
        ))}
      </div>
      <div className="card pad">
        <h3>Order pipeline</h3>
        <div className="pipeline">
          {["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((k) => (
            <Link to={`/seller/orders?status=${k}`} key={k} className={`pill-count ${k}`}>
              <b>{s.status_counts[k] || 0}</b><span>{STATUS_LABEL[k]}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
