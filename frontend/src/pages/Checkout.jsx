import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api, { errorMessage, fieldErrors } from "../api";
import { Field } from "../components/Field";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useToast } from "../context/ToastContext";
import { inr } from "../utils";

export default function Checkout() {
  const { user } = useAuth();
  const { lines, subtotal, delivery, total, clear } = useCart();
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ full_name: user?.name || "", phone: user?.phone || "", address_line: "", city: "", state: "Odisha", pincode: "", notes: "" });
  const [errs, setErrs] = useState({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  if (lines.length === 0) return <Navigate to="/cart" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setErrs({}); setFormError("");
    try {
      const { data } = await api.post("/orders/", {
        ...f, payment_method: "cod", items: lines.map((l) => ({ product: l.id, quantity: l.qty })),
      });
      clear();
      toast("Order placed successfully!");
      navigate("/orders", { state: { placed: data.id }, replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrs(fe);
      setFormError(fe.items ? "" : errorMessage(err));
      if (err.response?.data?.items) setFormError([].concat(err.response.data.items).join(" "));
    } finally { setBusy(false); }
  };

  return (
    <div className="container checkout">
      <h1>Checkout</h1>
      <form className="cart-grid" onSubmit={submit} noValidate>
        <div className="card pad">
          <h3>Delivery address</h3>
          {formError && <div className="alert" role="alert">{formError}</div>}
          <div className="form-grid">
            <Field id="full_name" label="Full name" error={errs.full_name}><input id="full_name" value={f.full_name} onChange={set("full_name")} required autoComplete="name" /></Field>
            <Field id="phone" label="Phone" error={errs.phone && "Enter a valid phone number"}><input id="phone" value={f.phone} onChange={set("phone")} inputMode="tel" required autoComplete="tel" /></Field>
            <Field id="address_line" label="Address" error={errs.address_line}><input id="address_line" value={f.address_line} onChange={set("address_line")} placeholder="House no, street, landmark" required autoComplete="street-address" /></Field>
            <Field id="city" label="City" error={errs.city}><input id="city" value={f.city} onChange={set("city")} required autoComplete="address-level2" /></Field>
            <Field id="state" label="State" error={errs.state}><input id="state" value={f.state} onChange={set("state")} required autoComplete="address-level1" /></Field>
            <Field id="pincode" label="PIN code" error={errs.pincode}><input id="pincode" value={f.pincode} onChange={set("pincode")} inputMode="numeric" maxLength={6} required autoComplete="postal-code" /></Field>
          </div>
          <Field id="notes" label="Delivery notes (optional)"><input id="notes" value={f.notes} onChange={set("notes")} maxLength={300} /></Field>
          <h3>Payment</h3>
          <label className="radio on"><input type="radio" checked readOnly /> Cash on delivery</label>
        </div>
        <aside className="card summary">
          <h3>Order summary</h3>
          {lines.map((l) => (
            <div className="row small" key={l.id}><span>{l.qty} × {l.name}</span><span>{inr(l.price * l.qty)}</span></div>
          ))}
          <hr />
          <div className="row"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
          <div className="row"><span>Delivery</span><span>{delivery ? inr(delivery) : "Free"}</span></div>
          <div className="row total"><span>Total</span><span>{inr(total)}</span></div>
          <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Placing order…" : "Place order"}</button>
          <Link to="/cart" className="link center small">← Back to cart</Link>
        </aside>
      </form>
    </div>
  );
}
