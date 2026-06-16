import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Package, ShoppingBag, DollarSign } from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { request } from "../../config/api";

interface AdminSummary {
  customers?: number;
  sellers?: number;
  total_orders?: number;
  total_revenue?: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [data, setData] = React.useState<AdminSummary | null>(null);
  const [productCount, setProductCount] = React.useState<number | null>(null);
  const [ordersCount, setOrdersCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* ===========================
     LOAD ADMIN SUMMARY
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await request<AdminSummary>("/dashboard/admin/overview");
        setData(res);

        // separately fetch product count (server doesn't return it)
        try {
          const products = await request<any[]>('/product');
          setProductCount(Array.isArray(products) ? products.length : null);
        } catch (e) {
          setProductCount(null);
        }
        // fetch orders count: prefer admin endpoint, avoid noisy 404s
        try {
          const ords = await request<any[]>('/admin/orders', { suppressToast: true, allowNotFound: true });
          if (Array.isArray(ords)) {
            setOrdersCount(ords.length);
          } else {
            // fallback to overview-provided value
            setOrdersCount(null);
          }
        } catch (e) {
          // if the admin endpoint is not available, don't spam console — use overview value
          setOrdersCount(null);
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load admin dashboard");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ===========================
     STATES
  =========================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error ?? "Unable to load admin data"}
      </div>
    );
  }

  /* ===========================
     UI
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8 space-y-8">
          <h1 className="text-3xl">Admin Dashboard</h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              icon={<Users />}
              label="Users"
              value={data?.customers ?? "—"}
              onClick={() => navigate("/admin/users")}
            />

            <StatCard
              icon={<Users />}
              label="Sellers"
              value={data?.sellers ?? "—"}
              onClick={() => navigate("/admin/sellers")}
            />

            <StatCard
              icon={<ShoppingBag />}
              label="Orders"
              value={ordersCount ?? data?.total_orders ?? "—"}
              onClick={() => navigate("/admin/orders")}
            />

            <StatCard
              icon={<DollarSign />}
              label="Revenue"
              value={
                typeof data?.total_revenue === "number"
                  ? `₹${data!.total_revenue.toFixed(2)}`
                  : "—"
              }
            />
            <StatCard
              icon={<Package />}
              label="Edit Banner"
              value={""}
              onClick={() => navigate("/admin/banner")}
            />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-border ${
      onClick
        ? "cursor-pointer hover:border-[#00B0FF]"
        : ""
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 flex items-center justify-center bg-[#00B0FF]/10 rounded-lg text-[#00B0FF]">
        {icon}
      </div>
    </div>
    <h3 className="text-2xl">{value}</h3>
    <p className="text-muted-foreground">{label}</p>
  </div>
);

export default AdminDashboard;
