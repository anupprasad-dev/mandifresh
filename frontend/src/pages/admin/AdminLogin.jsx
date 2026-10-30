import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { errorMessage } from "../../api";
import AuthLayout from "../../components/AuthLayout";
import { Field, PasswordInput } from "../../components/Field";
import { useAuth } from "../../context/AuthContext";

export default function AdminLogin() {
  const { user, adminLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user?.role === "admin") return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await adminLogin(email, password); navigate("/admin", { replace: true }); }
    catch (err) { setError(errorMessage(err, "Could not sign you in.")); }
    finally { setBusy(false); }
  };

  return (
    <AuthLayout variant="admin" title="Administrator sign in" subtitle="Authorised personnel only.">
      <form onSubmit={submit}>
        {error && <div className="alert" role="alert">{error}</div>}
        <Field id="email" label="Admin email"><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required autoFocus /></Field>
        <Field id="password" label="Password"><PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthLayout>
  );
}
