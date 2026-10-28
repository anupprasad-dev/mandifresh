import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api, { errorMessage } from "../api";
import { Field, PasswordInput, StrengthBar } from "../components/Field";
import { Logo } from "../components/Header";

export default function ResetPassword({ seller = false }) {
  const [params] = useSearchParams();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError("");
    if (pw !== confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await api.post("/auth/password-reset/confirm/", { uid: params.get("uid"), token: params.get("token"), new_password: pw });
      setDone(true);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={submit}>
        <Logo />
        <h1>Choose a new password</h1>
        {done ? (
          <div className="success-box">Your password has been reset. <Link className="link" to={seller ? "/seller/login" : "/login"}>Sign in</Link></div>
        ) : (
          <>
            {error && <div className="alert" role="alert">{error}</div>}
            <Field id="pw" label="New password"><PasswordInput id="pw" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></Field>
            <StrengthBar value={pw} />
            <Field id="cf" label="Confirm new password"><PasswordInput id="cf" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></Field>
            <button className="btn btn-primary btn-lg block" disabled={busy}>{busy ? "Saving…" : "Reset password"}</button>
          </>
        )}
      </form>
    </div>
  );
}
