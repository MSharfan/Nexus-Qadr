import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  MapPin,
  Settings,
  LogOut,
  ChevronRight,
} from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { decodeJwt } from "../../utils/jwt";

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = React.useState("User");
  const [email, setEmail] = React.useState("");

  /* ===========================
     LOAD USER FROM JWT
  =========================== */
  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const payload = decodeJwt(token);
    if (!payload) return;

    if (typeof payload.name === "string") {
      setName(payload.name);
    }

    if (typeof payload.email === "string") {
      setEmail(payload.email);
    }
  }, []);

  /* ===========================
     LOGOUT
  =========================== */
  const logout = () => {
    localStorage.clear();
    navigate("/auth", { replace: true });
  };

  /* ===========================
     UI
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#0D47A1] to-[#00B0FF] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#00B0FF]/30">
                  <User className="w-12 h-12 text-white" />
                </div>
                <h2 className="text-xl mb-1">{name}</h2>
                {email && (
                  <p className="text-sm text-muted-foreground">{email}</p>
                )}
              </div>

              {/* Menu */}
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-border overflow-hidden">
                <MenuItem
                  icon={<User />}
                  label="Edit Profile"
                  onClick={() => navigate('/profile/edit')}
                />
                <MenuItem
                  icon={<MapPin />}
                  label="Addresses"
                  onClick={() => navigate('/profile/addresses')}
                />
                <MenuItem
                  icon={<Settings />}
                  label="Settings"
                  onClick={() => navigate('/profile/settings')}
                />
                <button
                  onClick={logout}
                  className="w-full p-4 flex items-center gap-4 hover:bg-destructive/10 transition-colors text-destructive"
                >
                  <LogOut className="w-5 h-5" />
                  <span className="flex-1 text-left">Logout</span>
                </button>
              </div>
            </div>

            {/* Info */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
                <h2 className="text-2xl mb-4">Account</h2>
                <p className="text-muted-foreground">
                  Manage your account details, addresses, and settings.
                </p>

                <div className="mt-6">
                  <button
                    onClick={() => navigate("/orders")}
                    className="text-[#00B0FF] hover:underline"
                  >
                    View Order History →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const MenuItem = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="w-full p-4 flex items-center gap-4 hover:bg-secondary transition-colors border-b border-border"
  >
    <span className="w-5 h-5 text-[#00B0FF]">{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    <ChevronRight className="w-5 h-5 text-muted-foreground" />
  </button>
);

export default ProfilePage;
