import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api";
import { Spinner } from "../../components/Guards";
import Pagination from "../../components/Pagination";
import { useToast } from "../../context/ToastContext";
import { STATUS_LABEL, dateTime, inr } from "../../utils";

const NEXT_LABEL = { confirmed: "Confirm", packed: "Mark packed", shipped: "Mark shipped", delivered: "Mark delivered", cancelled: "Cancel" };

export default function SellerOrders() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get("/seller/orders/", { params: { status: status || undefined, page } })
      .then((r) => setData(r.data)).catch((e) => toast(errorMessage(e), "error"));
  }, [status, page, toast]);
  useEffect(() => { document.title = "Orders - Seller"; setData(null); load(); }, [load]);

  const move = async (item, next) => {
    if (next === "cancelled" && !window.confirm("Cancel this item? Stock will be returned.")) return;
    try { await api.patch(`/seller/orders/${item.id}/status/`, { status: next }); toast(`Marked ${STATUS_LABEL[next].toLowerCase()}`); load(); }
    catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <>
      <div className="page-head"><h1>Orders</h1></div>
      <div className="chips">
        {["", "pending", "confirmed", "packed", "shipped", "delivered", "cancelled"].map((s) => (
          <button key={s || "all"} className={status === s ? "chip on" : "chip"} onClick={() => { setPage(1); setParams(s ? { status: s } : {}); }}>
            {s ? STATUS_LABEL[s] : "All"}
          </button>
        ))}
      </div>
      {!data ? <Spinner /> : data.results.length === 0 ? (
        <div className="empty"><div className="empty-emoji">🧾</div><h3>No orders here</h3></div>
      ) : data.results.map((i) => (
        <article className="card order" key={i.id}>
          <header>
            <div><strong>Order #{i.order_id}</strong><span className="muted"> • {dateTime(i.placed_at)}</span></div>
            <span className={`pill ${i.status}`}>{STATUS_LABEL[i.status]}</span>
          </header>
          <ul><li><span>{i.quantity} × {i.product_name} <span className="muted">({i.unit})</span></span><strong>{inr(i.line_total)}</strong></li></ul>
          <footer>
            <span className="muted">{i.customer_name} • {i.phone}<br />{i.address}</span>
            <span className="btn-row">
              {i.allowed_next.map((n) => (
                <button key={n} className={`btn ${n === "cancelled" ? "btn-ghost danger" : "btn-primary"}`} onClick={() => move(i, n)}>{NEXT_LABEL[n]}</button>
              ))}
            </span>
          </footer>
        </article>
      ))}
      {data && <Pagination page={page} count={data.count} onChange={setPage} />}
    </>
  );
}
