import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../../api";
import { Field } from "../../components/Field";
import { Spinner } from "../../components/Guards";
import ProductImage from "../../components/ProductImage";
import { useToast } from "../../context/ToastContext";
import { shrinkImage } from "../../utils";

const EMPTY = { name: "", category: "", description: "", price: "", mrp: "", unit: "1 kg", stock: "0", image_url: "", is_active: true };

export default function SellerProductForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const fileRef = useRef(null);
  const [f, setF] = useState(EMPTY);
  const [current, setCurrent] = useState(null); // saved product (for preview of existing photo)
  const [photo, setPhoto] = useState(null); // { blob, preview } chosen but not yet uploaded
  const [removePhoto, setRemovePhoto] = useState(false);
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
        .then((r) => {
          setCurrent(r.data);
          setF({ ...EMPTY, ...r.data, mrp: r.data.mrp ?? "", description: r.data.description || "", image_url: r.data.image_url || "" });
        })
        .catch((e) => setError(errorMessage(e)))
        .finally(() => setLoading(false));
    }
  }, [id, editing]);

  useEffect(() => () => { if (photo?.preview) URL.revokeObjectURL(photo.preview); }, [photo]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value });

  const pickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast("Please choose a JPEG, PNG or WebP image.", "error"); return; }
    try {
      const blob = await shrinkImage(file);
      setPhoto({ blob, preview: URL.createObjectURL(blob) });
      setRemovePhoto(false);
    } catch { toast("Could not read that image.", "error"); }
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setErrs({}); setError("");
    const payload = {
      name: f.name.trim(), category: f.category, description: f.description, price: f.price,
      mrp: f.mrp === "" ? null : f.mrp, unit: f.unit, stock: f.stock, image_url: f.image_url.trim(), is_active: f.is_active,
    };
    try {
      const { data } = editing ? await api.put(`/seller/products/${id}/`, payload) : await api.post("/seller/products/", payload);
      try {
        if (photo) {
          const fd = new FormData();
          fd.append("image", photo.blob, "photo.jpg");
          await api.post(`/seller/products/${data.id}/image/`, fd);
        } else if (removePhoto && current?.has_upload) {
          await api.delete(`/seller/products/${data.id}/image/`);
        }
      } catch (imgErr) {
        toast(`Saved, but the photo failed: ${errorMessage(imgErr)}`, "error");
        navigate(`/seller/products/${data.id}`);
        return;
      }
      toast(editing ? "Product updated" : "Product added");
      navigate("/seller/products");
    } catch (err) {
      const fe = fieldErrors(err); setErrs(fe);
      if (!Object.keys(fe).length || fe.detail) setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  if (loading) return <Spinner />;
  const previewProduct = photo
    ? { name: f.name, image: photo.preview }
    : removePhoto ? { name: f.name, image_url: "", image: f.image_url } : { ...(current || {}), name: f.name || "Product", image: current?.image || f.image_url };
  return (
    <>
      <div className="page-head"><h1>{editing ? "Edit product" : "Add product"}</h1><Link to="/seller/products" className="link">← Back</Link></div>
      <form className="card pad" onSubmit={submit} noValidate>
        {error && <div className="alert" role="alert">{error}</div>}

        <div className="photo-box">
          <ProductImage product={{ ...previewProduct, category: current?.category_detail || cats.find((c) => String(c.id) === String(f.category)) }} size="md" />
          <div>
            <h3>Product photo</h3>
            <p className="muted small">JPEG, PNG or WebP. Photos are resized automatically. Without a photo shoppers see a friendly illustration tile.</p>
            <div className="btn-row">
              <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()}>{photo || current?.has_upload ? "Change photo" : "Upload photo"}</button>
              {(photo || (current?.has_upload && !removePhoto)) && (
                <button type="button" className="btn btn-ghost danger" onClick={() => { setPhoto(null); setRemovePhoto(true); }}>Remove</button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={pickPhoto} />
          </div>
        </div>

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
        <Field id="image_url" label="Or use an image link (optional)" error={errs.image_url} hint="Only used when no photo is uploaded.">
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
