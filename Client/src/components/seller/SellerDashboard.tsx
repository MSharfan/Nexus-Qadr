import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Eye,
  Plus,
} from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

import { orderApi, sellerEarningsApi, /* request */ } from "../../config/api";
import { request } from "../../config/api";
import { omsLabelFromStatus } from "../../utils/omsStatus";

interface SellerOrder {
  id: string;
  status?: string;
  total_amount?: number;
}

interface EarningsSummary {
  total_earnings?: number;
  total_orders?: number;
  total_products?: number;
}

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = React.useState<SellerOrder[]>([]);
  const [summary, setSummary] = React.useState<EarningsSummary>({});
  const [productCount, setProductCount] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);

  /* ===========================
     LOAD DATA
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [orderRows, earnings, sellerProducts] = await Promise.all([
          orderApi.sellerOrders(),
          sellerEarningsApi.summary() as Promise<any>,
          request<any[]>('/product/seller'),
        ]);

        const mappedOrders: SellerOrder[] = orderRows.map((o: any) => ({
          id: String(o.order_id ?? o.id),
          status: typeof o.status === "string" ? o.status : "Unknown",
          total_amount:
            typeof o.seller_total === "number"
              ? o.seller_total
              : typeof o.total_amount === "number"
              ? o.total_amount
              : undefined,
        }));

        setOrders(mappedOrders);
        setSummary({
          // server currently returns gross_earnings / net_earnings
          total_earnings: earnings?.net_earnings ?? earnings?.gross_earnings,
          total_orders: (orderRows && Array.isArray(orderRows) ? orderRows.length : 0),
          total_products: Array.isArray(sellerProducts) ? sellerProducts.length : 0,
        });
        setProductCount(Array.isArray(sellerProducts) ? sellerProducts.length : 0);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading dashboard…
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
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl mb-2">Seller Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your products and track your performance
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate("/seller/products/add")}
                className="bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white px-6 py-3 rounded-xl flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Product
              </button>

              <button
                onClick={() => {
                  // Withdraw / payout not implemented server-side yet
                  alert("Withdrawal feature will be available soon.");
                }}
                className="px-4 py-3 rounded-xl border border-border"
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 mt-4">
            <StatCard
              icon={<DollarSign />}
              label="Total Earnings"
              value={
                typeof summary.total_earnings === "number"
                  ? `₹${summary.total_earnings.toFixed(2)}`
                  : "—"
              }
              onClick={() => navigate('/seller/earnings')}
            />

            <StatCard
              icon={<Package />}
              label="Total Products"
              value={summary.total_products ?? "—"}
              onClick={() => navigate("/seller/products")}
            />

            <StatCard
              icon={<ShoppingBag />}
              label="Total Orders"
              value={summary.total_orders ?? "—"}
              onClick={() => navigate("/seller/orders")}
            />
          </div>

          {/* Recent Orders */}
          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl">Recent Orders</h2>
              <button
                onClick={() => navigate("/seller/orders")}
                className="text-[#00B0FF] hover:underline text-sm"
              >
                View All
              </button>
            </div>

            {orders.length === 0 ? (
              <p className="text-muted-foreground">No orders yet.</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((o) => (
                  <div
                    key={o.id}
                    className="flex justify-between items-center p-4 rounded-lg border border-border hover:border-[#00B0FF] transition-colors"
                  >
                    <div>
                      <p>Order #{o.id}</p>
                      <p className="text-sm text-muted-foreground">
                        {omsLabelFromStatus(o.status)}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {typeof o.total_amount === "number" && (
                        <span className="text-[#0D47A1] dark:text-[#00B0FF]">
                          ₹{o.total_amount.toFixed(2)}
                        </span>
                      )}
                      <Eye className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
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
    className={`bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border ${
      onClick ? "cursor-pointer hover:border-[#00B0FF]" : ""
    }`}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="w-12 h-12 rounded-lg bg-[#00B0FF]/10 flex items-center justify-center text-[#00B0FF]">
        {icon}
      </div>
      <TrendingUp className="w-5 h-5 text-green-500" />
    </div>
    <h3 className="text-2xl mb-1">{value}</h3>
    <p className="text-sm text-muted-foreground">{label}</p>
  </div>
);

export default SellerDashboard;
