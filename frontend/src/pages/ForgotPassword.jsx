import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";
import AuthLayout from "../components/AuthLayout";
import { Field } from "../components/Field";

export default function ForgotPassword({ seller = false }) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError("");
    try { await api.post("/auth/password-reset/", { email }); setDone(true); }
    catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <AuthLayout variant={seller ? "seller" : "customer"} title="Reset your password"
      footer={<Link to={seller ? "/seller/login" : "/login"} className="link">← Back to sign in</Link>}>
      {done ? (
        <div className="success-box">If that email is registered, we've sent a reset link. It is valid for 1 hour.</div>
      ) : (
        <form onSubmit={submit}>
          <p className="muted">Enter your account email and we'll send you a reset link.</p>
          {error && <div className="alert" role="alert">{error}</div>}
          <Field id="email" label="Email"><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
          <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </AuthLayout>
  );
}
