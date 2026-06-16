import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { passwordApi } from "../../config/api";
import {
  PASSWORD_REQUIREMENTS_MESSAGE,
  validateStrongPassword,
} from "../../utils/passwordPolicy";

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const token = params.get("token");

  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!token) {
      toast.error("Invalid or missing reset token");
      return;
    }

    if (!validateStrongPassword(password)) {
      toast.error(PASSWORD_REQUIREMENTS_MESSAGE);
      return;
    }

    try {
      setLoading(true);
      await passwordApi.reset(token, password);

      toast.success("Password reset successful");
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D47A1] to-[#00B0FF] p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md shadow-lg">
        <h2 className="text-xl mb-4 text-center">Reset Password</h2>

        <input
          type="password"
          placeholder="Enter new password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border p-3 rounded mb-4 bg-secondary"
          minLength={8}
        />
        <p className="mb-4 text-xs text-muted-foreground">
          {PASSWORD_REQUIREMENTS_MESSAGE}
        </p>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white p-3 rounded"
        >
          {loading ? "Resetting..." : "Reset Password"}
        </button>

        <button
          onClick={() => navigate("/auth")}
          className="w-full mt-3 text-sm text-gray-500 hover:underline"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
