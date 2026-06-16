import React from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface Props {
  children: React.ReactNode;
}

export const CustomerOnly: React.FC<Props> = ({ children }) => {
  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  const user = userRaw ? JSON.parse(userRaw) : null;

  if (!token) {
    toast.error("Please sign in to continue");
    return <Navigate to="/auth" replace />;
  }

  // Enforce customer role strictly
  const activeRole = user?.activeRole || user?.role;
  if (activeRole !== "customer") {
    toast.error("Access restricted to customers");
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default CustomerOnly;
