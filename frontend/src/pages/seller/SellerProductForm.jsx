import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../../api";
import { Field } from "../../components/Field";
import { Spinner } from "../../components/Guards";
import { useToast } from "../../context/ToastContext";

const EMPTY = { name: "", category: "", description: "", price: "", mrp: "", unit: "1 kg", stock: "0", image_url: "", is_active: true };

export default function SellerProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState(EMPTY);
  const [cats, setCats] = useState([]);
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${editing ? "Edit" : "Add"} product - Seller`;
    api.get("/categories/").then((r) => setCats(r.data));
    if (editing) {
      api.get(`/seller/products/${id}/`)
        .then((r) => setF({ ...EMPTY, ...r.data, mrp: r.data.mrp ?? "", description: r.data.description || "", image_url: r.data.image_url || "" }))
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false));
    }
  }, [id, editing]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErrs({}); setError("");
    const payload = {
      name: f.name.trim(), category: f.category, description: f.description, price: f.price,
      mrp: f.mrp === "" ? null : f.mrp, unit: f.unit, stock: f.stock, image_url: f.image_url.trim(), is_active: f.is_active,
    };
    try {
      if (editing) await api.put(`/seller/products/${id}/`, payload); else await api.post("/seller/products/", payload);
      toast(editing ? "Product updated" : "Product added");
      navigate("/seller/products");
    } catch (err) {
      const fe = fieldErrors(err); setErrs(fe);
      if (!Object.keys(fe).length || fe.detail) setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  return (
    <>
      <div className="page-head"><h1>{editing ? "Edit product" : "Add product"}</h1><Link to="/seller/products" className="link">← Back</Link></div>
      <form className="card pad" onSubmit={submit} noValidate>
        {error && <div className="alert" role="alert">{error}</div>}
        <div className="form-grid">
          <Field id="name" label="Product name" error={errs.name}><input id="name" value={f.name} onChange={set("name")} required /></Field>
          <Field id="category" label="Category" error={errs.category && "Choose a category"}>
            <select id="category" value={f.category} onChange={set("category")} required>
              <option value="">Select…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
            </select>
          </Field>
          <Field id="price" label="Selling price (₹)" error={errs.price}><input id="price" type="number" min="0.01" step="0.01" value={f.price} onChange={set("price")} required /></Field>
          <Field id="mrp" label="MRP (₹, optional)" error={errs.mrp} hint="Shows a discount badge when higher than price."><input id="mrp" type="number" min="0" step="0.01" value={f.mrp} onChange={set("mrp")} /></Field>
          <Field id="unit" label="Unit / pack size" error={errs.unit}><input id="unit" value={f.unit} onChange={set("unit")} placeholder="e.g. 500 g, 1 L, 1 dozen" required /></Field>
          <Field id="stock" label="Stock quantity" error={errs.stock}><input id="stock" type="number" min="0" step="1" value={f.stock} onChange={set("stock")} required /></Field>
        </div>
        <Field id="image_url" label="Image URL (optional)" error={errs.image_url} hint="Paste a link to a product photo. Leave blank to show an emoji tile.">
          <input id="image_url" type="url" value={f.image_url} onChange={set("image_url")} placeholder="https://…" />
        </Field>
        <Field id="description" label="Description" error={errs.description}><textarea id="description" rows={4} value={f.description} onChange={set("description")} /></Field>
        <label className="check"><input type="checkbox" checked={f.is_active} onChange={set("is_active")} /> Visible in the store</label>
        <div className="form-actions">
          <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add product"}</button>
        </div>
      </form>
    </>
  );
}
