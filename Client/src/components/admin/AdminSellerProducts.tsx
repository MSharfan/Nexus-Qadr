import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { request } from "../../config/api";
import { Product } from "../shared/ProductCard";

const AdminSellerProducts: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // try server-side seller filter
        let res = null;
        try {
          res = await request<any[]>(`/product?sellerId=${encodeURIComponent(sellerId || '')}`);
        } catch (e) {
          // fallback: fetch all and filter client-side
          const all = await request<any[]>('/product');
          res = Array.isArray(all) ? all.filter(p => String(p.seller_id) === String(sellerId)) : [];
        }
        const mapped = Array.isArray(res) ? res.map((p: any) => ({
          id: String(p.id),
          name: p.title ?? p.name ?? 'Unnamed',
          price: Number(p.price ?? 0),
          image: p.image_url ?? p.image ?? '',
          base_price: p.base_price ?? p.price,
          final_price: p.final_price ?? p.price,
          discount_percent: Number(p.discount_percent ?? 0),
        })) : [];
        setProducts(mapped as Product[]);
      } catch (e) {
        console.error(e);
        setError("Failed to load products for seller");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sellerId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading products…</div>;
  if (error) return <div className="min-h-screen flex items-center justify-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <button onClick={() => navigate(-1)} className="mb-4 text-sm text-[#0D47A1] hover:underline">Back</button>
          <h1 className="text-2xl mb-6">Products for seller {sellerId}</h1>
          {products.length === 0 ? (
            <div className="text-center py-8">No products found for this seller</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((p) => (
                <div key={p.id} className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-border p-4">
                  <img src={p.image} alt={p.name} className="w-full h-40 object-cover rounded-md mb-2" />
                  <div className="font-medium">{p.name}</div>
                  <div className="text-sm text-muted-foreground">Rs. {p.price?.toFixed(2)}</div>
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

export default AdminSellerProducts;
