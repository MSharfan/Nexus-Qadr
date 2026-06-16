import React from "react";
import { useNavigate } from "react-router-dom";
import { Package } from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

import { orderApi } from "../../config/api";
import { omsLabelFromStatus } from "../../utils/omsStatus";

interface Order {
  id: string;
  status?: string;
  created_at?: string;
  total_amount?: number;
  itemCount?: number;
  firstItemName?: string;
  firstItemImage?: string;
  firstItemId?: string;
}

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = React.useState<Order[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  /* ===========================
     LOAD ORDERS
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const rows: any[] = await orderApi.myOrders();

        // 🔒 SAFE MAPPING (NO ASSUMPTIONS)
        const mapped: Order[] = rows.map((o: any) => {
          // try to infer a representative item for the order
          const items = Array.isArray(o.items) ? o.items : Array.isArray(o.order_items) ? o.order_items : [];
          const first = items && items.length > 0 ? items[0] : null;

          // common shapes: item.product?.title | item.name | item.title
          const firstName = first?.product?.title ?? first?.name ?? first?.title ?? null;

          // common image paths: product.images[0], product.image, image
          const firstImage =
            first?.product?.images?.[0] ?? first?.product?.image ?? first?.image ?? null;
            const firstId = first?.product?.id ?? first?.product_id ?? null;

          return {
            id: String(o.id),
            status: typeof o.status === "string" ? o.status : "Unknown",
            created_at: o.created_at,
            total_amount:
              typeof o.total_amount === "number"
                ? o.total_amount
                : undefined,
            itemCount: Array.isArray(items) ? items.length : undefined,
            firstItemName: typeof firstName === "string" ? firstName : undefined,
            firstItemImage: typeof firstImage === "string" ? firstImage : undefined,
            firstItemId: firstId ? String(firstId) : undefined,
          };
        });

        setOrders(mapped);
      } catch (err) {
        console.error(err);
        setError("Failed to load orders");
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
        Loading orders…
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
    UI (DESIGN UNCHANGED)
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <Package className="w-6 h-6 text-[#00B0FF]" />
            <h2 className="text-2xl">Your Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="py-12 text-center">
              You have no orders yet.
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 rounded-xl border border-border hover:border-[#00B0FF] transition-colors cursor-pointer"
                  onClick={() => navigate(`/orders/${o.id}`)}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      {o.firstItemImage ? (
                        <img
                          src={o.firstItemImage}
                          alt={o.firstItemName ?? "item"}
                          loading="lazy"
                          className="flex-none w-12 h-12 rounded-md object-cover border border-border cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (o.firstItemId) navigate(`/product/${o.firstItemId}`);
                          }}
                        />
                      ) : (
                        <div
                          className="flex-none w-12 h-12 rounded-md bg-muted-foreground flex items-center justify-center text-white cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (o.firstItemId) navigate(`/product/${o.firstItemId}`);
                          }}
                        >
                          <Package className="w-5 h-5" />
                        </div>
                      )}

                      <div>
                        <h3 className="font-medium">Order #{o.id}</h3>
                        {o.firstItemName && (
                          <p className="text-sm text-muted-foreground">
                            {o.firstItemName}
                            {typeof o.itemCount === "number" && o.itemCount > 1 && (
                              <span>{` and ${o.itemCount - 1} more`}</span>
                            )}
                          </p>
                        )}

                        {o.created_at && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {new Date(o.created_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      {typeof o.total_amount === "number" && (
                        <p className="text-lg text-[#0D47A1] dark:text-[#00B0FF]">
                          ₹{o.total_amount.toFixed(2)}
                        </p>
                      )}

                      {o.status && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                          {omsLabelFromStatus(o.status)}
                        </span>
                      )}
                    </div>
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

export default OrdersPage;
