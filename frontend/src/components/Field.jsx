import { useState } from "react";

export function Field({ label, error, hint, children, id }) {
  return (
    <div className={`field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {error ? <small className="err">{error}</small> : hint ? <small className="muted">{hint}</small> : null}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, autoComplete = "current-password", placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="pw">
      <input id={id} type={show ? "text" : "password"} value={value} onChange={onChange}
        autoComplete={autoComplete} placeholder={placeholder} required />
      <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}

/** Simple client-side strength hint; the server is the source of truth for validation. */
export function strength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
}

export function StrengthBar({ value }) {
  if (!value) return null;
  const s = strength(value);
  const labels = ["Too weak", "Weak", "Okay", "Good", "Strong"];
  return (
    <div className={`strength s${s}`} aria-live="polite">
      <div className="bar"><i style={{ width: `${(s / 4) * 100}%` }} /></div>
      <small>{labels[s]}</small>
    </div>
  );
}
