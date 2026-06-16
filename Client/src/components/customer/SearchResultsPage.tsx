import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { ProductCard, Product } from "../shared/ProductCard";
import { cartApi, searchApi } from "../../config/api";
import { toastError, toastSuccess } from "../../utils/toast";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const SearchResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const q = useQuery().get("q") || "";
  const category = useQuery().get("category") || "all";

  const [loading, setLoading] = React.useState(false);
  const [products, setProducts] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await searchApi.search({ q: q || undefined, category: category || undefined, limit: 48 });
        if (cancelled) return;
        setProducts(resp?.products ?? []);
      } catch (err) {
        console.error(err);
        setError("Search failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [q, category]);

  // restore scroll position when returning from product details
  React.useEffect(() => {
    try {
      const pos = sessionStorage.getItem("products_scroll");
      if (pos) {
        window.scrollTo({ top: Number(pos), left: 0 });
        sessionStorage.removeItem("products_scroll");
      }
    } catch (e) {}
  }, []);

  const handleAddToCart = React.useCallback(async (product: Product) => {
    try {
      await cartApi.add({ product_id: product.id, quantity: 1 });
      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Added to cart");
    } catch (err) {
      console.error("Failed to add to cart", err);
      toastError("Failed to add to cart");
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-2xl">Search results for "{q}"</h1>
            <div className="text-sm text-muted-foreground">Category: {category}</div>
          </div>

          {loading ? (
            <div className="py-8">Loading…</div>
          ) : error ? (
            <div className="py-8 text-red-500">{error}</div>
          ) : products.length === 0 ? (
            <div className="py-8 text-muted-foreground">No products found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((p) => (
                <ProductCard
                  key={p.id}
                  product={{
                    id: String(p.id),
                    name: p.title ?? p.name,
                    price: Number(p.price ?? 0),
                    base_price: (
                      p?.base_price ?? p?.mrp ?? p?.original_price ?? p?.list_price ?? p?.price_before_discount
                    ) === undefined
                      ? undefined
                      : Number(p?.base_price ?? p?.mrp ?? p?.original_price ?? p?.list_price ?? p?.price_before_discount),
                    final_price: (
                      p?.final_price ?? p?.price_after_discount ?? p?.discounted_price
                    ) === undefined
                      ? undefined
                      : Number(p?.final_price ?? p?.price_after_discount ?? p?.discounted_price),
                    discount_percent: Number(p?.discount_percent ?? p?.discount ?? 0),
                    image: p.image_url ?? p.image,
                    trending: Boolean(p.is_trending),
                    rating: Number(p.rating ?? p.average_rating ?? p.avg_rating ?? p.review_rating ?? 0),
                  }}
                  onClick={() => { try { sessionStorage.setItem("products_scroll", String(window.scrollY ?? window.pageYOffset ?? 0)); } catch{}; navigate(`/product/${p.id}`); }}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SearchResultsPage;
