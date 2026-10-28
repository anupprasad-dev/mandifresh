import { useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../api";
import { Field } from "../components/Field";
import { Logo } from "../components/Header";

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
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <Logo />
        <h1>Reset your password</h1>
        {done ? (
          <div className="success-box">If that email is registered, we've sent a reset link. It is valid for 1 hour.</div>
        ) : (
          <>
            <p className="muted">Enter your account email and we'll send you a reset link.</p>
            {error && <div className="alert" role="alert">{error}</div>}
            <Field id="email" label="Email"><input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus /></Field>
            <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
          </>
        )}
        <p className="center"><Link to={seller ? "/seller/login" : "/login"} className="link">← Back to sign in</Link></p>
      </form>
    </div>
  );
}
