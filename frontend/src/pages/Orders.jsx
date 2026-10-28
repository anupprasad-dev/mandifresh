import { useCallback, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import api, { errorMessage } from "../api";
import { Spinner } from "../components/Guards";
import Pagination from "../components/Pagination";
import { useToast } from "../context/ToastContext";
import { STATUS_LABEL, dateTime, inr } from "../utils";

export default function Orders() {
  const { state } = useLocation();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.get("/orders/", { params: { page } }).then((r) => setData(r.data)).catch((e) => setError(errorMessage(e)));
  }, [page]);
  useEffect(() => { document.title = "My orders - MandiFresh"; load(); }, [load]);

  const cancel = async (id) => {
    if (!window.confirm("Cancel this order?")) return;
    try { await api.post(`/orders/${id}/cancel/`); toast("Order cancelled"); load(); }
    catch (e) { toast(errorMessage(e), "error"); }
  };

  if (error) return <div className="container"><div className="alert">{error}</div></div>;
  if (!data) return <Spinner />;

  return (
    <div className="container orders">
      <h1>My orders</h1>
      {state?.placed && <div className="success-box">🎉 Thank you! Order #{state.placed} has been placed. Pay on delivery.</div>}
      {data.results.length === 0 ? (
        <div className="empty"><div className="empty-emoji">📦</div><h3>No orders yet</h3>
          <Link to="/shop" className="btn btn-primary">Start shopping</Link></div>
      ) : data.results.map((o) => (
        <article className="card order" key={o.id}>
          <header>
            <div><strong>Order #{o.id}</strong><span className="muted"> • {dateTime(o.created_at)}</span></div>
            <span className={`pill ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
          </header>
          <ul>
            {o.items.map((i) => (
              <li key={i.id}>
                <span>{i.quantity} × {i.product_slug ? <Link to={`/product/${i.product_slug}`}>{i.product_name}</Link> : i.product_name} <span className="muted">({i.unit})</span></span>
                <span><span className={`pill sm ${i.status}`}>{STATUS_LABEL[i.status]}</span> {inr(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <footer>
            <span className="muted">Deliver to {o.full_name}, {o.address_line}, {o.city} - {o.pincode}</span>
            <span><strong>Total {inr(o.total)}</strong>
              {o.items.every((i) => i.status === "pending") && <button className="btn btn-ghost danger" onClick={() => cancel(o.id)}>Cancel order</button>}
            </span>
          </footer>
        </article>
      ))}
      <Pagination page={page} count={data.count} onChange={setPage} />
    </div>
  );
}
