import React from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";

import { Header } from "./Header";
import { Footer } from "./Footer";
import { decodeJwt } from "../../utils/jwt";

const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();

  const goHome = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    const payload = decodeJwt(token);
    const roles: string[] = Array.isArray(payload?.roles)
      ? payload.roles
      : payload?.role
      ? [payload.role]
      : [];

    if (roles.includes("admin")) navigate("/admin", { replace: true });
    else if (roles.includes("seller")) navigate("/seller", { replace: true });
    else navigate("/", { replace: true });
  };

  const goBackSafely = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      goHome();
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main
        className="flex-1 bg-gray-50 dark:bg-[#0A0A0A] flex items-center justify-center"
        role="alert"
      >
        <div className="max-w-md w-full px-6 text-center">
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-8 border border-border shadow-sm">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />

            <h1 className="text-2xl mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-6">
              You don’t have permission to view this page.
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={goBackSafely}
                className="flex items-center justify-center gap-2 border border-border rounded-xl py-3 hover:bg-secondary transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Go Back
              </button>

              <button
                onClick={goHome}
                className="bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white py-3 rounded-xl"
              >
                Go to Home
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UnauthorizedPage;
