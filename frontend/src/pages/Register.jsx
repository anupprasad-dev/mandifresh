import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errorMessage, fieldErrors } from "../api";
import { Field, PasswordInput, StrengthBar } from "../components/Field";
import { Logo } from "../components/Header";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [errs, setErrs] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dest = state?.from || "/";

  if (user?.role === "customer") return <Navigate to={dest} replace />;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(""); setErrs({});
    if (f.password !== f.confirm) { setErrs({ confirm: "Passwords do not match." }); return; }
    setBusy(true);
    try {
      await register({ name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(), password: f.password });
      navigate(dest, { replace: true });
    } catch (err) {
      const fe = fieldErrors(err);
      setErrs(fe);
      if (!Object.keys(fe).length || fe.detail) setError(errorMessage(err));
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit} noValidate>
        <Logo />
        <h1>Create your account</h1>
        <p className="muted">It takes less than a minute.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <Field id="name" label="Full name" error={errs.name}><input id="name" value={f.name} onChange={set("name")} autoComplete="name" required autoFocus /></Field>
        <Field id="email" label="Email" error={errs.email}><input id="email" type="email" value={f.email} onChange={set("email")} autoComplete="email" required /></Field>
        <Field id="phone" label="Phone (optional)" error={errs.phone && "Enter a valid phone number"}><input id="phone" value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" /></Field>
        <Field id="password" label="Password" error={errs.password} hint="At least 8 characters. Avoid common passwords.">
          <PasswordInput id="password" value={f.password} onChange={set("password")} autoComplete="new-password" />
        </Field>
        <StrengthBar value={f.password} />
        <Field id="confirm" label="Confirm password" error={errs.confirm}><PasswordInput id="confirm" value={f.confirm} onChange={set("confirm")} autoComplete="new-password" /></Field>
        <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Creating account…" : "Create account"}</button>
        <p className="center muted">Already have an account? <Link to="/login" state={state} className="link">Sign in</Link></p>
      </form>
    </div>
  );
}
