import { useState } from "react";
import api, { errorMessage, fieldErrors } from "../api";
import { Field, PasswordInput, StrengthBar } from "../components/Field";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

export default function Account() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || "" });
  const [pw, setPw] = useState({ old_password: "", new_password: "" });
  const [pwErr, setPwErr] = useState({});

  const saveProfile = async (e) => {
    e.preventDefault();
    try { const { data } = await api.patch("/auth/me/", profile); setUser(data); toast("Profile updated"); }
    catch (err) { toast(errorMessage(err), "error"); }
  };

  const changePw = async (e) => {
    e.preventDefault(); setPwErr({});
    try { await api.post("/auth/change-password/", pw); setPw({ old_password: "", new_password: "" }); toast("Password changed"); }
    catch (err) { setPwErr(fieldErrors(err)); }
  };

  return (
    <div className="container narrow">
      <h1>My account</h1>
      <form className="card pad" onSubmit={saveProfile}>
        <h3>Profile</h3>
        <Field id="email" label="Email"><input id="email" value={user.email} disabled /></Field>
        <Field id="name" label="Full name"><input id="name" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required /></Field>
        <Field id="phone" label="Phone"><input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
        <button className="btn btn-primary">Save changes</button>
      </form>
      <form className="card pad" onSubmit={changePw}>
        <h3>Change password</h3>
        <Field id="old" label="Current password" error={pwErr.old_password}><PasswordInput id="old" value={pw.old_password} onChange={(e) => setPw({ ...pw, old_password: e.target.value })} /></Field>
        <Field id="new" label="New password" error={pwErr.new_password}><PasswordInput id="new" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} autoComplete="new-password" /></Field>
        <StrengthBar value={pw.new_password} />
        <button className="btn btn-primary">Update password</button>
      </form>
    </div>
  );
}
