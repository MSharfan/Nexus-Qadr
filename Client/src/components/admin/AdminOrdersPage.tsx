import React from "react";
import { useLocation } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { request } from "../../config/api";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const AdminOrdersPage: React.FC = () => {
  const query = useQuery();
  const sellerId = query.get("sellerId");
  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Try admin orders endpoint first, allow 404 without noisy errors
        let res: any[] | null = null;
        try {
          res = await request<any[]>('/admin/orders', { suppressToast: true, allowNotFound: true });
          if (!res) {
            // fallback to legacy endpoints
            try {
              res = await request<any[]>('/order', { suppressToast: true, allowNotFound: true });
            } catch (e) {
              try {
                res = await request<any[]>('/orders', { suppressToast: true, allowNotFound: true });
              } catch (e2) {
                res = [];
              }
            }
          }
        } catch (e) {
          res = [];
        }
        let list = Array.isArray(res) ? res : [];
        if (sellerId) {
          list = list.filter((o) => String(o.seller_id ?? o.sellerId ?? o.seller?.id ?? "") === String(sellerId));
        }
        setOrders(list);
      } catch (e) {
        console.error(e);
        setError("Failed to load orders");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [sellerId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading orders…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl mb-6">Admin Orders {sellerId ? `(Seller ${sellerId})` : ''}</h1>
          {orders.length === 0 ? (
            <div className="text-center py-8">No orders found</div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div key={o.id || o.order_id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-xl border border-border">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium">Order #{o.order_id ?? o.id}</div>
                      <div className="text-sm text-muted-foreground">{new Date(o.created_at || o.createdAt || Date.now()).toLocaleString()}</div>
                    </div>
                    <div className="text-[#0D47A1]">{typeof o.total_amount === 'number' ? `Rs. ${o.total_amount.toFixed(2)}` : o.total_amount ?? '-'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminOrdersPage;
