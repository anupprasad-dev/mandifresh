import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { errorMessage } from "../api";
import { Field, PasswordInput } from "../components/Field";
import { Logo } from "../components/Header";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const { state } = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dest = state?.from || "/";

  if (user?.role === "customer") return <Navigate to={dest} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try { await login(email, password); navigate(dest, { replace: true }); }
    catch (err) { setError(errorMessage(err, "Could not sign you in.")); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <Logo />
        <h1>Welcome back</h1>
        <p className="muted">Sign in to track orders and checkout faster.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        <Field id="email" label="Email"><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required autoFocus /></Field>
        <Field id="password" label="Password"><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <div className="right"><Link to="/forgot-password" className="link small">Forgot password?</Link></div>
        <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <p className="center muted">New to MandiFresh? <Link to="/register" state={state} className="link">Create an account</Link></p>
      </form>
    </div>
  );
}
