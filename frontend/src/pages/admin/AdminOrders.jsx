import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api";
import { Spinner } from "../../components/Guards";
import Pagination from "../../components/Pagination";
import { useToast } from "../../context/ToastContext";
import { STATUS_LABEL, dateTime, inr } from "../../utils";

export default function AdminOrders() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/orders/", { params: { page, status: status || undefined, q: term || undefined } })
      .then((r) => setData(r.data)).catch((e) => toast(errorMessage(e), "error"));
  }, [page, status, term, toast]);
  useEffect(() => { document.title = "Orders - Admin"; setData(null); load(); }, [load]);

  return (
    <>
      <div className="page-head"><h1>Orders</h1></div>
      <div className="toolbar-row">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q); }}>
          <input placeholder="Order #, customer, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-outline">Search</button>
        </form>
      </div>
      <div className="chips">
        {["", "pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((s) => (
          <button key={s || "all"} className={status === s ? "chip on" : "chip"} onClick={() => { setPage(1); setParams(s ? { status: s } : {}); }}>
            {s ? STATUS_LABEL[s] : "All"}
          </button>
        ))}
      </div>
      {!data ? <Spinner /> : data.results.length === 0 ? (
        <div className="empty"><div className="empty-emoji">🧾</div><h3>No orders found</h3></div>
      ) : data.results.map((o) => (
        <article className="card order" key={o.id}>
          <header>
            <div><strong>Order #{o.id}</strong><span className="muted"> · {dateTime(o.created_at)}</span></div>
            <span className={`pill ${o.status}`}>{STATUS_LABEL[o.status] || o.status}</span>
          </header>
          <ul>
            {o.items.map((i) => (
              <li key={i.id}>
                <span>{i.quantity} × {i.product_name} <span className="muted">({i.unit})</span></span>
                <span><span className={`pill sm ${i.status}`}>{STATUS_LABEL[i.status]}</span> {inr(i.line_total)}</span>
              </li>
            ))}
          </ul>
          <footer>
            <span className="muted">{o.full_name} · {o.phone} · {o.customer_email}<br />{o.address_line}, {o.city}, {o.state} - {o.pincode}</span>
            <strong>Total {inr(o.total)}</strong>
          </footer>
        </article>
      ))}
      {data && <Pagination page={page} count={data.count} onChange={setPage} />}
    </>
  );
}
