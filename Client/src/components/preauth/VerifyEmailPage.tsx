import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { authApi } from "../../config/api";
import { toast } from "sonner";

const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get("token");
  const [loading, setLoading] = React.useState(false);
  const [status, setStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    const doVerify = async () => {
      if (!token) {
        setStatus("missing");
        return;
      }

      try {
        setLoading(true);
        await authApi.verifyEmail(token);
        setStatus("success");
        toast.success("Email verified. You can now sign in.");
        setTimeout(() => navigate("/auth", { replace: true }), 1200);
      } catch (err: any) {
        setStatus("failed");
        toast.error(err.message || "Verification failed");
      } finally {
        setLoading(false);
      }
    };

    doVerify();
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D47A1] via-[#1565C0] to-[#00B0FF] p-4">
      <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 w-full max-w-md shadow-lg text-center">
        <h2 className="text-xl mb-4">Verify Email</h2>
        {loading && <p>Verifying...</p>}
        {!loading && status === "success" && <p className="text-green-600">Email verified — redirecting to sign in.</p>}
        {!loading && status === "failed" && (
          <>
            <p className="text-red-600 mb-4">Verification failed or token expired.</p>
            <button onClick={() => navigate('/auth')} className="text-[#00B0FF]">Back to Sign In</button>
          </>
        )}
        {!loading && status === "missing" && (
          <>
            <p className="text-red-600 mb-4">Missing token.</p>
            <button onClick={() => navigate('/auth')} className="text-[#00B0FF]">Back to Sign In</button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
