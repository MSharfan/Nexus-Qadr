import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { userApi } from "../../config/api";

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const u = await userApi.getProfile();
        if (!mounted) return;
        setName(u.name ?? "");
        setEmail(u.email ?? "");
      } catch (e) {
        console.error(e);
        setError("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await userApi.updateProfile({ name, email });
      try {
        const { toast } = await import("sonner");
        toast.success("Profile updated");
      } catch {}
      navigate("/profile");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl mb-4">Edit Profile</h1>

          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-border max-w-lg">
              <label className="block mb-2 text-sm">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 border rounded mb-4 bg-transparent"
              />

              <label className="block mb-2 text-sm">Email</label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 border rounded mb-4 bg-transparent"
              />

              {error && <div className="text-red-500 mb-2">{error}</div>}

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-[#00B0FF] text-white rounded"
                >
                  {saving ? "Saving…" : "Save"}
                </button>

                <button
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 border rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EditProfilePage;
