import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../../api";
import { Spinner } from "../../components/Guards";
import Pagination from "../../components/Pagination";
import ProductImage from "../../components/ProductImage";
import { useToast } from "../../context/ToastContext";
import { inr } from "../../utils";

export default function AdminProducts() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [active, setActive] = useState("");
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    api.get("/admin/products/", { params: { page, q: term || undefined, active: active || undefined } })
      .then((r) => setData(r.data)).catch((e) => toast(errorMessage(e), "error"));
  }, [page, term, active, toast]);
  useEffect(() => { document.title = "Products - Admin"; load(); }, [load]);

  const patch = async (p, body, msg) => {
    try { await api.patch(`/admin/products/${p.id}/`, body); toast(msg); load(); } catch (e) { toast(errorMessage(e), "error"); }
  };
  const del = async (p) => {
    if (!window.confirm(`Permanently delete “${p.name}”? Past orders keep their history.`)) return;
    try { await api.delete(`/admin/products/${p.id}/`); toast("Product deleted"); load(); } catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <>
      <div className="page-head"><h1>Products</h1></div>
      <div className="toolbar-row">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q); }}>
          <input placeholder="Search product, store or seller email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <button className="btn btn-outline">Search</button>
        </form>
        <div className="chips">
          {[["", "All"], ["1", "Visible"], ["0", "Hidden"]].map(([v, l]) => (
            <button key={l} className={active === v ? "chip on" : "chip"} onClick={() => { setPage(1); setActive(v); }}>{l}</button>
          ))}
        </div>
      </div>
      {!data ? <Spinner /> : data.results.length === 0 ? (
        <div className="empty"><div className="empty-emoji">📦</div><h3>No products found</h3></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th>Seller</th><th>Price</th><th>Stock</th><th>Home page</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.results.map((p) => (
                <tr key={p.id}>
                  <td><div className="cell-product"><ProductImage product={p} size="xs" /><div><b>{p.name}</b><br /><span className="muted small">{p.category_name} · {p.unit}</span></div></div></td>
                  <td>{p.store_name}<br /><span className="muted small">{p.seller_email}{!p.seller_approved && " · not approved"}</span></td>
                  <td>{inr(p.price)}</td>
                  <td className={p.stock === 0 ? "err" : ""}>{p.stock}</td>
                  <td><button className={`switch ${p.is_featured ? "on" : ""}`} onClick={() => patch(p, { is_featured: !p.is_featured }, p.is_featured ? "Removed from featured" : "Featured on home page")}>{p.is_featured ? "★ Featured" : "Feature"}</button></td>
                  <td><button className={`switch ${p.is_active ? "on" : ""}`} onClick={() => patch(p, { is_active: !p.is_active }, p.is_active ? "Product hidden" : "Product visible")}>{p.is_active ? "Visible" : "Hidden"}</button></td>
                  <td className="actions"><button className="link danger" onClick={() => del(p)}>Delete</button></td>
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
