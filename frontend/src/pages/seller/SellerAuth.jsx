import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { errorMessage, fieldErrors } from "../../api";
import { Field, PasswordInput, StrengthBar } from "../../components/Field";
import { useAuth } from "../../context/AuthContext";

function Shell({ title, subtitle, children, onSubmit }) {
  return (
    <div className="auth-wrap seller-auth">
      <form className="card auth-card" onSubmit={onSubmit} noValidate>
        <div className="logo"><span className="logo-mark">🏪</span><span className="logo-text">Mandi<b>Fresh</b> Seller</span></div>
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
      </form>
    </div>
  );
}

export function SellerLogin() {
  const { user, sellerLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.role === "seller") return <Navigate to="/seller" replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await sellerLogin(email, password); navigate("/seller", { replace: true }); }
    catch (err) { setError(errorMessage(err, "Could not sign you in.")); }
    finally { setBusy(false); }
  };

  return (
    <Shell title="Seller sign in" subtitle="Manage your products and orders." onSubmit={submit}>
      {error && <div className="alert" role="alert">{error}</div>}
      <Field id="email" label="Email"><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></Field>
      <Field id="password" label="Password"><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
      <div className="right"><Link to="/seller/forgot-password" className="link small">Forgot password?</Link></div>
      <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      <p className="center muted">Want to sell on MandiFresh? <Link to="/seller/register" className="link">Create a seller account</Link></p>
    </Shell>
  );
}

export function SellerRegister() {
  const { user, sellerRegister } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ store_name: "", name: "", email: "", phone: "", city: "", password: "", confirm: "" });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.role === "seller") return <Navigate to="/seller" replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault(); setError(""); setErrs({});
    if (f.password !== f.confirm) return setErrs({ confirm: "Passwords do not match." });
    setBusy(true);
    try {
      const { confirm, ...payload } = f;
      await sellerRegister(payload);
      navigate("/seller", { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrs(fe);
      if (!Object.keys(fe).length || fe.detail) setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <Shell title="Become a seller" subtitle="Create your store and start selling in minutes." onSubmit={submit}>
      {error && <div className="alert" role="alert">{error}</div>}
      <Field id="store_name" label="Store name" error={errs.store_name}><input id="store_name" value={f.store_name} onChange={set("store_name")} required autoFocus /></Field>
      <div className="form-grid">
        <Field id="name" label="Your name" error={errs.name}><input id="name" value={f.name} onChange={set("name")} required autoComplete="name" /></Field>
        <Field id="city" label="City" error={errs.city}><input id="city" value={f.city} onChange={set("city")} /></Field>
      </div>
      <div className="form-grid">
        <Field id="email" label="Email" error={errs.email}><input id="email" type="email" value={f.email} onChange={set("email")} required autoComplete="email" /></Field>
        <Field id="phone" label="Phone" error={errs.phone && "Enter a valid phone number"}><input id="phone" value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" /></Field>
      </div>
      <Field id="password" label="Password" error={errs.password} hint="At least 8 characters. Avoid common passwords."><PasswordInput id="password" value={f.password} onChange={set("password")} autoComplete="new-password" /></Field>
      <StrengthBar value={f.password} />
      <Field id="confirm" label="Confirm password" error={errs.confirm}><PasswordInput id="confirm" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" /></Field>
      <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Creating store…" : "Create seller account"}</button>
      <p className="center muted">Already a seller? <Link to="/seller/login" className="link">Sign in</Link></p>
    </Shell>
  );
}
