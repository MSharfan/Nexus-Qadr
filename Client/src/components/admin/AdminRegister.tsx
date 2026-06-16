import React from "react";
import { useNavigate } from "react-router-dom";
import { authApi } from "../../config/api";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  validateStrongPassword,
} from "../../utils/passwordPolicy";

const AdminRegister: React.FC = () => {
  const navigate = useNavigate();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !email || !password) {
      setError("All fields are required");
      return;
    }

    if (!validateStrongPassword(password)) {
      setError(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    try {
      setLoading(true);
      await authApi.register({ name, email, password, role: "admin" as any });
      try {
        const { toast } = await import("sonner");
        toast.success("Admin account created. Please sign in.");
      } catch {}
      navigate("/auth", { replace: true });
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#00B0FF] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#0b0b0b] rounded-xl p-6 shadow">
        <h1 className="text-2xl mb-4">Create Admin Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1 text-sm">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 rounded border bg-transparent"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 rounded border bg-transparent"
              required
            />
          </div>

          <div>
            <label className="block mb-1 text-sm">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded border bg-transparent"
              minLength={8}
              required
            />
            <p className="mt-2 text-xs text-muted-foreground">
              {PASSWORD_REQUIREMENTS_MESSAGE}
            </p>
          </div>

          {error && <div className="text-red-500">{error}</div>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-[#00B0FF] text-white rounded"
            >
              {loading ? "Creating…" : "Create Admin"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="px-4 py-2 border rounded"
            >
              Back to Sign In
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminRegister;
