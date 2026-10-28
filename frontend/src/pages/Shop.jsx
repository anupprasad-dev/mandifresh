import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../api";
import Pagination from "../components/Pagination";
import ProductCard from "../components/ProductCard";

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const [cats, setCats] = useState([]);
  const [data, setData] = useState({ results: [], count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const q = params.get("q") || "";
  const category = params.get("category") || "";
  const sort = params.get("sort") || "newest";
  const deals = params.get("deals") === "1";
  const inStock = params.get("in_stock") === "1";
  const page = Number(params.get("page") || 1);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: "1", ...patch }).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next);
  };

  useEffect(() => { api.get("/categories/").then((r) => setCats(r.data)).catch(() => {}); }, []);

  useEffect(() => {
    document.title = "Shop - MandiFresh";
    setLoading(true);
    setError(false);
    api.get("/products/", { params: { q, category, sort, page, deals: deals ? 1 : undefined, in_stock: inStock ? 1 : undefined } })
      .then((r) => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [q, category, sort, page, deals, inStock]);

  const activeCat = cats.find((c) => c.slug === category);

  return (
    <div className="container shop">
      <aside className="filters card">
        <h3>Categories</h3>
        <button className={!category ? "chip on" : "chip"} onClick={() => update({ category: "" })}>All</button>
        {cats.map((c) => (
          <button key={c.id} className={category === c.slug ? "chip on" : "chip"} onClick={() => update({ category: c.slug })}>
            {c.emoji} {c.name}
          </button>
        ))}
        <h3>Filters</h3>
        <label className="check"><input type="checkbox" checked={deals} onChange={(e) => update({ deals: e.target.checked ? "1" : "" })} /> Deals only</label>
        <label className="check"><input type="checkbox" checked={inStock} onChange={(e) => update({ in_stock: e.target.checked ? "1" : "" })} /> In stock</label>
      </aside>

      <div>
        <div className="shop-head">
          <div>
            <h1>{q ? `Results for “${q}”` : activeCat ? activeCat.name : deals ? "Today's deals" : "All products"}</h1>
            {!loading && <p className="muted">{data.count} item{data.count === 1 ? "" : "s"}</p>}
          </div>
          <select value={sort} onChange={(e) => update({ sort: e.target.value })} aria-label="Sort products">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: low to high</option>
            <option value="price_desc">Price: high to low</option>
            <option value="name">Name A–Z</option>
          </select>
        </div>

        {error ? (
          <div className="alert">Couldn't load products. Please try again.</div>
        ) : loading ? (
          <div className="grid">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="card skeleton" />)}</div>
        ) : data.results.length === 0 ? (
          <div className="empty">
            <div className="empty-emoji">🔎</div>
            <h3>No products found</h3>
            <p className="muted">Try a different search or clear the filters.</p>
            <button className="btn btn-primary" onClick={() => setParams({})}>Clear filters</button>
          </div>
        ) : (
          <div className="grid">{data.results.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        )}
        <Pagination page={page} count={data.count} onChange={(p) => update({ page: String(p) })} />
      </div>
    </div>
  );
}
