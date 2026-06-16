import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { request, productApi } from "../../config/api";
import { toast } from "sonner";

const AdminProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = React.useState<any[]>([]);
  const [updating, setUpdating] = React.useState<Record<string, boolean>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const rows = await request<any[]>('/admin/products');
        setProducts(Array.isArray(rows) ? rows : []);
      } catch (err) {
        console.error(err);
        setError('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading products…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl mb-6">All Products</h1>

          {products.length === 0 ? (
            <div className="text-muted-foreground">No products found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 cursor-pointer hover:shadow"
                >
                  <div className="relative" onClick={() => navigate(`/product/${p.id}`)}>
                    <img src={p.image_url || p.image} alt={p.title || p.name} className="w-full h-40 object-cover rounded-md mb-3" />
                    {p.is_trending && (
                      <div className="absolute top-2 right-2 bg-[#00B0FF] text-white text-xs px-2 py-1 rounded-md">Trending</div>
                    )}
                  </div>

                  <div className="text-lg font-medium line-clamp-1">{p.title ?? p.name}</div>
                  <div className="text-sm text-muted-foreground">₹{Number(p.price ?? 0).toFixed(2)}</div>

                  <label className="flex items-center gap-2 mt-3">
                    <input
                      type="checkbox"
                      checked={Boolean(p.is_trending)}
                      disabled={Boolean(updating[p.id])}
                      onChange={async () => {
                        try {
                          setUpdating((s) => ({ ...s, [p.id]: true }));
                          await productApi.toggleTrending(p.id, !Boolean(p.is_trending));
                          setProducts((rows) => rows.map((r) => (r.id === p.id ? { ...r, is_trending: !Boolean(r.is_trending) } : r)));
                          toast.success(`Updated trending for ${p.title ?? p.name}`);
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setUpdating((s) => ({ ...s, [p.id]: false }));
                        }
                      }}
                    />
                    <span className="text-sm">Trending</span>
                  </label>
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

export default AdminProductsPage;
