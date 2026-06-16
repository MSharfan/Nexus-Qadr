import React from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { request } from "../../config/api";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

const SellerList: React.FC = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // Try admin route first, fallback to public seller list
        let res = null;
        try {
          res = await request<any[]>("/admin/sellers");
        } catch (e) {
          try {
            res = await request<any[]>("/seller");
          } catch (e2) {
            res = [];
          }
        }
        setSellers(Array.isArray(res) ? res : []);
      } catch (e) {
        console.error(e);
        setError("Failed to load sellers");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading sellers…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl mb-6">Sellers</h1>
          {sellers.length === 0 ? (
            <div className="text-center py-8">No sellers found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {sellers.map((s) => (
                <div key={s.id} className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-border" >
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-10 h-10 flex items-center justify-center bg-[#00B0FF]/10 rounded-lg text-[#00B0FF]"><Users /></div>
                    <div>
                      <div className="font-medium">{s.name || s.shop_name || `Seller ${s.id}`}</div>
                      <div className="text-sm text-muted-foreground">{s.email || s.contact || ''}</div>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-3">Products: {s.product_count ?? '—'}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/admin/sellers/${s.id}/products`)} className="px-3 py-1 rounded bg-[#00B0FF] text-white text-sm">View Products</button>
                    <button onClick={() => navigate(`/admin/orders?sellerId=${s.id}`)} className="px-3 py-1 rounded border border-border text-sm">View Orders</button>
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

export default SellerList;
