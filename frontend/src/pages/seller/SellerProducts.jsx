import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../api";
import { Spinner } from "../../components/Guards";
import Pagination from "../../components/Pagination";
import ProductImage from "../../components/ProductImage";
import { useToast } from "../../context/ToastContext";
import { inr } from "../../utils";

export default function SellerProducts() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");

  const load = useCallback(() => {
    api.get("/seller/products/", { params: { page, q: term || undefined } })
      .then((r) => setData(r.data)).catch((e) => toast(errorMessage(e), "error"));
  }, [page, term, toast]);
  useEffect(() => { document.title = "Products - Seller"; load(); }, [load]);

  const toggle = async (p) => {
    try { await api.patch(`/seller/products/${p.id}/`, { is_active: !p.is_active }); load(); }
    catch (e) { toast(errorMessage(e), "error"); }
  };
  const del = async (p) => {
    if (!window.confirm(`Delete “${p.name}”? Past orders keep their history.`)) return;
    try { await api.delete(`/seller/products/${p.id}/`); toast("Product deleted"); load(); }
    catch (e) { toast(errorMessage(e), "error"); }
  };

  return (
    <>
      <div className="page-head">
        <h1>Products</h1>
        <Link to="/seller/products/new" className="btn btn-primary">+ Add product</Link>
      </div>
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setTerm(q); }}>
        <input placeholder="Search your products…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="btn btn-outline">Search</button>
      </form>
      {!data ? <Spinner /> : data.results.length === 0 ? (
        <div className="empty"><div className="empty-emoji">📦</div><h3>No products yet</h3>
          <Link to="/seller/products/new" className="btn btn-primary">Add your first product</Link></div>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
            <tbody>
              {data.results.map((p) => (
                <tr key={p.id}>
                  <td><div className="cell-product"><ProductImage product={{ ...p, category: p.category_detail }} size="xs" /><div><b>{p.name}</b><br /><span className="muted small">{p.category_detail?.name} • {p.unit}</span></div></div></td>
                  <td>{inr(p.price)}{p.mrp && Number(p.mrp) > Number(p.price) && <><br /><s className="muted small">{inr(p.mrp)}</s></>}</td>
                  <td className={p.stock <= 5 ? "err" : ""}>{p.stock}</td>
                  <td><button className={`switch ${p.is_active ? "on" : ""}`} onClick={() => toggle(p)} aria-pressed={p.is_active}>{p.is_active ? "Active" : "Hidden"}</button></td>
                  <td className="actions"><Link to={`/seller/products/${p.id}`} className="link">Edit</Link> <button className="link danger" onClick={() => del(p)}>Delete</button></td>
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
