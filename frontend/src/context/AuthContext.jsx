import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api, { refreshAccess, setAccessToken, setSessionExpiredHandler } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true until the first session check finishes

  // Restore the session from the httpOnly refresh cookie on page load.
  useEffect(() => {
    let alive = true;
    refreshAccess()
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    setSessionExpiredHandler(() => setUser(null));
    return () => { alive = false; };
  }, []);

  const finish = (data) => { setAccessToken(data.access); setUser(data.user); return data.user; };

  const login = useCallback(async (email, password) => finish((await api.post("/auth/login/", { email, password })).data), []);
  const register = useCallback(async (payload) => finish((await api.post("/auth/register/", payload)).data), []);
  const sellerLogin = useCallback(async (email, password) => finish((await api.post("/seller/auth/login/", { email, password })).data), []);
  const sellerRegister = useCallback(async (payload) => finish((await api.post("/seller/auth/register/", payload)).data), []);
  const adminLogin = useCallback(async (email, password) => finish((await api.post("/admin/auth/login/", { email, password })).data), []);
  const logout = useCallback(async () => {
    try { await api.post("/auth/logout/"); } catch { /* cookie is cleared best-effort */ }
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, loading, login, register, sellerLogin, sellerRegister, adminLogin, logout, applySession: finish }),
    [user, loading, login, register, sellerLogin, sellerRegister, adminLogin, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
