import React from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { request } from "../../config/api";

interface Product {
  id: string;
  name?: string;
  seller_id?: string;
  price?: number;
  status?: string;
}

const ProductApprovalPage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* ===========================
     LOAD PENDING PRODUCTS
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const res: any[] = await request("/product");

        const pending = res
          .filter((p) => p?.status === "pending")
          .map((p) => ({
            id: String(p.id),
            name:
              typeof p.name === "string"
                ? p.name
                : "Unnamed product",
            seller_id:
              typeof p.seller_id === "string"
                ? p.seller_id
                : "—",
            price:
              typeof p.price === "number"
                ? p.price
                : undefined,
            status: p.status,
          }));

        setProducts(pending);
      } catch (e) {
        console.error(e);
        setError("Failed to load pending products");
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
        Loading products…
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
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <h1 className="text-3xl mb-6">Pending Products</h1>

          {products.length === 0 ? (
            <p className="text-muted-foreground">
              No products pending approval.
            </p>
          ) : (
            <div className="space-y-4">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="p-6 bg-white dark:bg-[#1a1a1a] rounded-xl border border-border"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium">
                        {p.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Seller ID: {p.seller_id}
                      </p>
                    </div>

                    {typeof p.price === "number" && (
                      <p className="text-[#0D47A1] dark:text-[#00B0FF]">
                        ₹{p.price.toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-red-500">
                    Approval / rejection API is not yet exposed
                    by backend.
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

export default ProductApprovalPage;
