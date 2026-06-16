import { Navigate, Outlet, useLocation } from "react-router-dom";

const TOKEN_KEY = "token";

const RequireAuth: React.FC = () => {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);

  // If no token, redirect to auth page
  if (!token) {
    return (
      <Navigate
        to="/auth"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Token exists → allow access
  return <Outlet />;
};

export default RequireAuth;
