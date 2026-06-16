import { Navigate, Outlet } from 'react-router-dom';
import { decodeJwt } from '../utils/jwt';

const SellerOnly = () => {
  // Prefer explicit stored role (set at login). Fallback to token decode.
  const storedRole = localStorage.getItem('role');
  if (storedRole === 'seller') return <Outlet />;

  const token = localStorage.getItem('token');
  if (!token) return <Navigate to="/auth" replace />;

  const payload = decodeJwt(token);

  /**
   * Accept both:
   * - roles: string[]
   * - role: string
   * WITHOUT assuming backend shape
   */
  const roles: string[] =
    Array.isArray(payload?.roles)
      ? payload.roles
      : payload?.role
      ? [payload.role]
      : [];

  const isSeller = roles.includes('seller');

  if (!isSeller) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

export default SellerOnly;
