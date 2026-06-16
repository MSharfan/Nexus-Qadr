import React from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { passwordApi } from "../../config/api";

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async () => {
    if (!email) {
      toast.error("Email is required");
      return;
    }

    try {
      setLoading(true);
      await passwordApi.forgot(email);

      toast.success("Password reset link sent");
      navigate("/auth", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-[#0A0A0A] p-4">
      <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl w-full max-w-md shadow-lg">
        <h2 className="text-xl mb-4 text-center">Forgot Password</h2>

        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border p-3 rounded mb-4 bg-secondary"
        />

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white p-3 rounded"
        >
          {loading ? "Sending..." : "Send Reset Link"}
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

export default ForgotPasswordPage;
