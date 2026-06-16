import React from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { authApi } from "../../config/api";
// @ts-ignore: Treat image import as any to avoid missing module type declaration
import splashLogo from "../../assets/images/splash-logo.png";
import { Link } from "react-router-dom";
import { Input } from "../ui/input";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  validateStrongPassword,
} from "../../utils/passwordPolicy";

type Mode = "login" | "signup";
type Role = "customer" | "seller";

const AuthPage: React.FC = () => {
  const navigate = useNavigate();

  const [mode, setMode] = React.useState<Mode>("login");
  const [role, setRole] = React.useState<Role>("customer");

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  /* =========================
     SUBMIT
  ========================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    if (mode === "signup" && !name) {
      setError("Name is required");
      return;
    }

    if (mode === "signup" && !validateStrongPassword(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    try {
      setLoading(true);

      if (mode === "login") {
        // 🔒 LOGIN: email + password ONLY
        const res = await authApi.login({ email, password });
        localStorage.setItem("token", res.token);

        const roles: string[] =
          Array.isArray(res?.user?.roles) && res.user?.roles
            ? res.user.roles
            : [];

        const tokenRole: "customer" | "seller" | "admin" | null =
          roles.includes("admin")
            ? "admin"
            : roles.includes("seller")
              ? "seller"
              : roles.includes("customer")
                ? "customer"
                : null;

        const finalRole =
          tokenRole ?? (role as "customer" | "seller" | "admin");

        localStorage.setItem("role", finalRole);
        localStorage.setItem("roles", JSON.stringify(roles));

        // 🔁 Redirect based on final role (server > token > UI)
        if (finalRole === "seller") navigate("/seller", { replace: true });
        else if (finalRole === "admin") navigate("/admin", { replace: true });
        else navigate("/", { replace: true });
      } else {
        // 🔒 SIGNUP: role IS required
        await authApi.register({
          name,
          email,
          password,
          role,
        });

        // After signup → back to login
        setMode("login");
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#00B0FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src={splashLogo}
            alt="Nexus Qadr"
            className="w-16 h-16 mx-auto mb-4 drop-shadow-2xl animate-pulse"
          />
          <h1 className="text-3xl text-white mb-1">Nexus Qadr</h1>
          <p className="text-white/80">
            {mode === "login" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl mb-6 text-center">
            {mode === "login" ? "Sign In" : "Sign Up"}
          </h2>

          {error && <p className="text-red-500 text-center mb-4">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (Signup only) */}
            {mode === "signup" && (
              <div>
                <label className="block mb-2 text-sm">Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="text"
                    name="name"
                    placeholder="Enter the Name"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-12 pr-4 rounded-xl"
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block mb-2 text-sm">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="email"
                  name="email"
                  placeholder="Enter the email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 pr-4 rounded-xl"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block mb-2 text-sm">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter the password"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 rounded-xl"
                  minLength={mode === "signup" ? 8 : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {mode === "signup" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {PASSWORD_REQUIREMENTS_MESSAGE}
                </p>
              )}
            </div>

            {/* Role (Signup only) */}
            {mode === "signup" && (
              <div>
                <label className="block mb-2 text-sm">Register as</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("customer")}
                    className={`flex-1 py-2 rounded-lg border ${
                      role === "customer"
                        ? "bg-[#0D47A1] text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    Customer
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("seller")}
                    className={`flex-1 py-2 rounded-lg border ${
                      role === "seller"
                        ? "bg-[#0D47A1] text-white"
                        : "bg-gray-100"
                    }`}
                  >
                    Seller
                  </button>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white py-3 rounded-xl hover:shadow-lg transition-all"
            >
              {loading
                ? "Please wait..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[#00B0FF] hover:underline">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>

          {/* Switch */}
          <div className="mt-6 text-center text-sm">
            {mode === "login"
              ? "Don’t have an account?"
              : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-[#00B0FF] hover:underline"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
