import { Navigate, Outlet } from 'react-router-dom';
import { decodeJwt } from '../utils/jwt';

const AdminOnly = () => {
  // Prefer explicit stored role (set at login). Fallback to token decode.
  const storedRole = localStorage.getItem('role');
  if (storedRole === 'admin') return <Outlet />;

  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/auth" replace />;

  const payload = decodeJwt(token);

  /**
   * Support both possible JWT shapes without assuming backend schema:
   * - roles: string[]
   * - role: string
   */
  const roles: string[] =
    Array.isArray(payload?.roles)
      ? payload.roles
      : payload?.role
      ? [payload.role]
      : [];

  const isAdmin = roles.includes('admin');

  if (!isAdmin) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

export default AdminOnly;
