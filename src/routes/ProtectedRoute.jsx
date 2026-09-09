import { Navigate } from "react-router-dom";
import { getUser, isAuthenticated } from "../utils/auth";

export default function ProtectedRoute({ children, allowedRoles }) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const user = getUser();

  if (!allowedRoles.includes(user.role)) {
    if (user.role === "admin") return <Navigate to="/dashboard-admin" replace />;
    if (user.role === "atasan") return <Navigate to="/dashboard-atasan" replace />;
    if (user.role === "keuangan") return <Navigate to="/dashboard-keuangan" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
