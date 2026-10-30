import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Spinner({ label = "Loading…" }) {
  return <div className="center-state"><div className="spinner" /><p className="muted">{label}</p></div>;
}

export function RequireCustomer({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname + loc.search }} replace />;
  if (user.role !== "customer") return <Navigate to="/" replace />;
  return children;
}

export function RequireSeller({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== "seller") return <Navigate to="/seller/login" replace />;
  return children;
}

export function RequireAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  if (!user || user.role !== "admin") return <Navigate to="/admin/login" replace />;
  return children;
}
