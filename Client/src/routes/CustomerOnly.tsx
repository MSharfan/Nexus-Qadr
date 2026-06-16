import { Navigate, Outlet } from "react-router-dom";
import { decodeJwt } from "../utils/jwt";

const CustomerOnly: React.FC = () => {
  // Prefer explicit stored role (set at login). Fallback to token decode.
  const storedRole = localStorage.getItem("role");
  if (storedRole === "customer") return <Outlet />;

  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/auth" replace />;

  const payload = decodeJwt(token);

  const roles: string[] = Array.isArray(payload?.roles)
    ? payload.roles
    : typeof payload?.role === "string"
    ? [payload.role]
    : [];

  const isCustomer = roles.includes("customer");

  if (!isCustomer) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

export default CustomerOnly;
