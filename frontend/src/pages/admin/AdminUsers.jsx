import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../../api";
import { Spinner } from "../../components/Guards";
import Pagination from "../../components/Pagination";
import { useToast } from "../../context/ToastContext";
import { dateTime } from "../../utils";

/** One screen for both customers and sellers (role prop). */
export default function AdminUsers({ role }) {
  const isSeller = role === "seller";
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const pending = params.get("pending") === "1";
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/users/", { params: { role, page, q: term || undefined, pending: pending ? 1 : undefined } })
      .then((r) => setData(r.data)).catch((e) => toast(errorMessage(e), "error"));
  }, [role, page, term, pending, toast]);
  useEffect(() => { document.title = `${isSeller ? "Sellers" : "Customers"} - Admin`; setData(null); load(); }, [load, isSeller]);

  const act = async (fn, okMsg) => {
    try { await fn(); toast(okMsg); load(); } catch (e) { toast(errorMessage(e), "error"); }
  };
  const setActive = (u, is_active) => {
    if (!is_active && !window.confirm(`Disable ${u.email}? They will be signed out everywhere.`)) return;
    act(() => api.post(`/admin/users/${u.id}/active/`, { is_active }), is_active ? "Account enabled" : "Account disabled");
  };
  const setApproved = (u, approved) =>
    act(() => api.post(`/admin/sellers/${u.id}/approval/`, { approved }), approved ? "Seller approved" : "Seller suspended");

  return (
    <>
      <div className="page-head"><h1>{isSeller ? "Sellers" : "Customers"}</h1></div>
      <div className="toolbar-row">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q); }}>
          <input placeholder={isSeller ? "Search store, name or email…" : "Search name or email…"} value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-outline">Search</button>
        </form>
        {isSeller && (
          <div className="chips">
            <button className={!pending ? "chip on" : "chip"} onClick={() => { setPage(1); setParams({}); }}>All</button>
            <button className={pending ? "chip on" : "chip"} onClick={() => { setPage(1); setParams({ pending: "1" }); }}>Awaiting approval</button>
          </div>
        )}
      </div>
      {!data ? <Spinner /> : data.results.length === 0 ? (
        <div className="empty"><div className="empty-emoji">🔎</div><h3>Nothing found</h3></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>{isSeller ? "Store" : "Customer"}</th><th>Contact</th><th>Joined</th>{isSeller ? <th>Products</th> : <th>Orders</th>}<th>Status</th><th /></tr></thead>
            <tbody>
              {data.results.map((u) => (
                <tr key={u.id}>
                  <td><b>{isSeller ? u.store_name : u.name}</b><br /><span className="muted small">{isSeller ? `${u.name}${u.city ? ` · ${u.city}` : ""}` : `ID ${u.id}`}</span></td>
                  <td>{u.email}<br /><span className="muted small">{u.phone || "—"}</span></td>
                  <td className="small">{dateTime(u.date_joined)}</td>
                  <td>{isSeller ? u.product_count : u.order_count}</td>
                  <td>
                    {!u.is_active ? <span className="pill cancelled">Disabled</span>
                      : isSeller ? (u.seller_approved ? <span className="pill delivered">Approved</span> : <span className="pill pending">Pending</span>)
                      : <span className="pill delivered">Active</span>}
                  </td>
                  <td className="actions">
                    {isSeller && u.is_active && (u.seller_approved
                      ? <button className="link danger" onClick={() => setApproved(u, false)}>Suspend</button>
                      : <button className="link" onClick={() => setApproved(u, true)}>Approve</button>)}
                    {u.is_active
                      ? <button className="link danger" onClick={() => setActive(u, false)}>Disable</button>
                      : <button className="link" onClick={() => setActive(u, true)}>Enable</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {data && <Pagination page={page} count={data.count} onChange={setPage} />}
    </>
  );
}
