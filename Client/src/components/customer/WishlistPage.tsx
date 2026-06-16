import React from "react";
import { useNavigate } from "react-router-dom";
import { Heart } from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

import { wishlistApi } from "../../config/api";

interface WishlistItem {
  product_id: string;
  name?: string;
  price?: number;
}

const WishlistPage: React.FC = () => {
  const navigate = useNavigate();

  const [items, setItems] = React.useState<WishlistItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* ===========================
     LOAD WISHLIST
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const rows: any[] = await wishlistApi.get();

        // 🔒 SAFE MAPPING (NO ASSUMPTIONS)
        const mapped: WishlistItem[] = rows.map((i: any) => ({
          product_id: String(i.product_id ?? i.id),
          name:
            typeof i.name === "string"
              ? i.name
              : typeof i.title === "string"
              ? i.title
              : "Unnamed product",
          price:
            typeof i.price === "number"
              ? i.price
              : undefined,
        }));

        setItems(mapped);
      } catch (err) {
        console.error(err);
        setError("Failed to load wishlist");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ===========================
     REMOVE
  =========================== */
  const remove = async (productId: string) => {
    try {
      await wishlistApi.remove(productId);
      setItems((prev) =>
        prev.filter(
          (i) => String(i.product_id) !== String(productId)
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  /* ===========================
     STATES
  =========================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading wishlist…
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error}
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
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Heart className="w-6 h-6 text-[#00B0FF]" />
            <h2 className="text-2xl">Wishlist</h2>
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center">
              Your wishlist is empty.
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((it) => (
                <div
                  key={it.product_id}
                  className="p-4 rounded-xl border border-border flex justify-between items-center"
                >
                  <div>
                    <h4>{it.name}</h4>
                    {typeof it.price === "number" && (
                      <p className="text-sm text-muted-foreground">
                        ₹{it.price.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() =>
                        navigate(`/product/${it.product_id}`)
                      }
                      className="text-[#00B0FF]"
                    >
                      View
                    </button>

                    <button
                      onClick={() => remove(it.product_id)}
                      className="text-destructive"
                    >
                      Remove
                    </button>
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

export default WishlistPage;
