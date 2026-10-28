import axios from "axios";

// Access token is kept in memory only. The refresh token is an httpOnly cookie managed by the server.
let accessToken = null;
let onSessionExpired = () => {};

export const setAccessToken = (t) => { accessToken = t; };
export const setSessionExpiredHandler = (fn) => { onSessionExpired = fn; };

const api = axios.create({ baseURL: "/api", withCredentials: true });

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let refreshing = null;
export function refreshAccess() {
  // De-duplicate concurrent refresh calls (refresh tokens rotate, so only one may win).
  if (!refreshing) {
    refreshing = axios
      .post("/api/auth/refresh/", null, { withCredentials: true })
      .then((r) => { accessToken = r.data.access; return r.data; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retried && accessToken) {
      original._retried = true;
      try {
        await refreshAccess();
        return api(original);
      } catch {
        accessToken = null;
        onSessionExpired();
      }
    }
    return Promise.reject(error);
  }
);

/** Turn any DRF error payload into a single readable message. */
export function errorMessage(err, fallback = "Something went wrong. Please try again.") {
  const d = err?.response?.data;
  if (!d) return err?.response ? fallback : "Cannot reach the server. Check your connection.";
  if (typeof d === "string") return fallback;
  if (d.detail) return d.detail;
  const first = Object.values(d)[0];
  const msg = Array.isArray(first) ? first[0] : typeof first === "string" ? first : null;
  return msg || fallback;
}

/** Field-level errors: { field: "message" } */
export function fieldErrors(err) {
  const d = err?.response?.data;
  const out = {};
  if (d && typeof d === "object") {
    for (const [k, v] of Object.entries(d)) out[k] = Array.isArray(v) ? v[0] : typeof v === "string" ? v : "";
  }
  return out;
}

export default api;
