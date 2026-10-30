import { useCallback, useEffect, useState } from "react";
import api, { errorMessage, fieldErrors } from "../../api";
import { Field } from "../../components/Field";
import { Spinner } from "../../components/Guards";
import { useToast } from "../../context/ToastContext";

const BLANK = { name: "", emoji: "🛒", sort_order: 0 };

export default function AdminCategories() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState(null);
  const [errs, setErrs] = useState({});

  const load = useCallback(() => {
    api.get("/admin/categories/").then((r) => setItems(r.data)).catch((e) => toast(errorMessage(e), "error"));
  }, [toast]);
  useEffect(() => { document.title = "Categories - Admin"; load(); }, [load]);

  const save = async (e) => {
    e.preventDefault(); setErrs({});
    try {
      if (editId) await api.patch(`/admin/categories/${editId}/`, form); else await api.post("/admin/categories/", form);
      toast(editId ? "Category updated" : "Category added");
      setForm(BLANK); setEditId(null); load();
    } catch (err) { setErrs(fieldErrors(err)); if (err.response?.data?.detail) toast(errorMessage(err), "error"); }
  };
  const del = async (c) => {
    if (!window.confirm(`Delete category “${c.name}”?`)) return;
    try { await api.delete(`/admin/categories/${c.id}/`); toast("Category deleted"); load(); } catch (err) { toast(errorMessage(err), "error"); }
  };

  return (
    <>
      <div className="page-head"><h1>Categories</h1></div>
      <form className="card pad cat-form" onSubmit={save}>
        <h3>{editId ? "Edit category" : "Add category"}</h3>
        <div className="form-grid three">
          <Field id="cname" label="Name" error={errs.name}><input id="cname" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field id="cemoji" label="Emoji" error={errs.emoji}><input id="cemoji" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} maxLength={8} /></Field>
          <Field id="corder" label="Sort order" error={errs.sort_order}><input id="corder" type="number" min="0" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></Field>
        </div>
        <div className="btn-row">
          <button className="btn btn-primary">{editId ? "Save changes" : "Add category"}</button>
          {editId && <button type="button" className="btn btn-ghost" onClick={() => { setEditId(null); setForm(BLANK); }}>Cancel</button>}
        </div>
      </form>
      {!items ? <Spinner /> : (
        <div className="card table-wrap spaced">
          <table className="table">
            <thead><tr><th>Category</th><th>Slug</th><th>Order</th><th>Products</th><th /></tr></thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id}>
                  <td><span className="cat-emoji-sm">{c.emoji}</span> <b>{c.name}</b></td>
                  <td className="muted small">{c.slug}</td><td>{c.sort_order}</td><td>{c.product_count}</td>
                  <td className="actions">
                    <button className="link" onClick={() => { setEditId(c.id); setForm({ name: c.name, emoji: c.emoji, sort_order: c.sort_order }); window.scrollTo(0, 0); }}>Edit</button>
                    <button className="link danger" onClick={() => del(c)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
