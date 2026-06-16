import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Truck, Package } from "lucide-react";
import OrderTimeline from "../shared/OrderTimeline";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

import { orderApi, deliveryApi, productApi } from "../../config/api";
import {
  canCustomerCancelOrder,
  isTrackableOmsStatus,
  omsLabelFromStatus,
} from "../../utils/omsStatus";

interface Order {
  id: string;
  status?: string;
  created_at?: string;
  total_amount?: number;
}

interface Delivery {
  status?: string;
  updated_at?: string;
  tracking_id?: string;
}

const OrderDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = React.useState<Order | null>(null);
  const [delivery, setDelivery] = React.useState<Delivery | null>(null);
  const [productThumb, setProductThumb] = React.useState<{ id?: string; image?: string; title?: string } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [cancelling, setCancelling] = React.useState(false);

  /* ===========================
     LOAD ORDER + DELIVERY
  =========================== */
  React.useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use server GET /order/:id which is role-aware
        const found: any = await orderApi.getById(id);
        if (!found) {
          setError("Order not found");
          return;
        }

        const mappedOrder: Order = {
          id: String(found.id),
          status: typeof found.status === "string" ? found.status : "Unknown",
          created_at: found.created_at,
          total_amount:
            typeof found.total_amount === "number"
              ? found.total_amount
              : undefined,
        };

        setOrder(mappedOrder);

        // Try to load a representative product thumbnail for UI
        try {
          const firstItem = found.items && found.items.length > 0 ? found.items[0] : null;
          const prodId = firstItem?.product_id ?? firstItem?.product?.id ?? null;
          if (prodId) {
            const p: any = await productApi.getById(String(prodId));
            const img = p?.image_url ?? p?.image ?? (p?.images && p.images[0]) ?? null;
            setProductThumb({ id: String(prodId), image: img, title: p?.title ?? p?.name ?? null });
          } else {
            setProductThumb(null);
          }
        } catch (e) {
          // non-critical
          setProductThumb(null);
        }

        // Delivery tracking (optional, backend-controlled)
        if (isTrackableOmsStatus(mappedOrder.status)) {
          try {
            const d: any = await deliveryApi.byOrder(id);
            const tracking = d?.tracking ?? d;
            setDelivery({
              status: tracking?.status,
              updated_at: tracking?.updated_at,
              tracking_id: tracking?.tracking_id ?? tracking?.tracking_number ?? tracking?.id,
            });
          } catch {
            setDelivery(null);
          }
        } else {
          setDelivery(null);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  /* ===========================
     STATES
  =========================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading order…
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error ?? "Order not found"}
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
          {/* Back */}
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Orders</span>
          </button>

          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="flex items-center gap-3">
                <Package className="w-6 h-6 text-[#00B0FF]" />
                <h2 className="text-2xl">Order #{order.id}</h2>
              </div>

              {productThumb && productThumb.image && (
                <img
                  src={productThumb.image}
                  alt={productThumb.title ?? 'product'}
                  className="rounded-lg overflow-hidden object-cover border border-border cursor-pointer"
                  style={{ width: 120, height: 120, objectFit: 'cover' }}
                  onClick={() => navigate(`/product/${productThumb.id}`)}
                />
              )}
            </div>

            {/* Order info */}
            <div className="space-y-3 mb-6">
              {order.created_at && (
                <p className="text-sm text-muted-foreground">
                  Placed on{" "}
                  {new Date(order.created_at).toLocaleString()}
                </p>
              )}

              {order.status && (
                <p>
                  Status:{" "}
                  <span className="font-medium">{omsLabelFromStatus(order.status)}</span>
                </p>
              )}

              {typeof order.total_amount === "number" && (
                <p className="text-lg text-[#0D47A1] dark:text-[#00B0FF]">
                  Total: ₹{order.total_amount.toFixed(2)}
                </p>
              )}
            </div>

            {/* Timeline */}
            <div className="mt-6">
              <OrderTimeline currentStatus={order.status} createdAt={order.created_at} delivery={delivery} />
            </div>

            {/* Delivery */}
            <div className="mt-6 border-t border-border pt-6">
              <div className="flex items-center gap-3 mb-4">
                <Truck className="w-5 h-5 text-[#00B0FF]" />
                <h3 className="text-lg">Delivery Status</h3>
              </div>

              {delivery ? (
                <div className="space-y-2">
                  {delivery.status && (
                    <p>
                      Status:{" "}
                      <span className="font-medium">
                        {omsLabelFromStatus(delivery.status)}
                      </span>
                    </p>
                  )}

                  {delivery.updated_at && (
                    <p className="text-sm text-muted-foreground">
                      Last updated{" "}
                      {new Date(
                        delivery.updated_at
                      ).toLocaleString()}
                    </p>
                  )}

                  {delivery.tracking_id && (
                    <p className="text-sm">
                      Tracking ID:{" "}
                      <span className="font-mono">
                        {delivery.tracking_id}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Delivery information not available yet.
                </p>
              )}
            </div>

            {/* Actions (cancel) */}
            <div className="mt-6">
              {order && canCustomerCancelOrder(order.status) && (
                <button
                  onClick={async () => {
                    if (!id) return;
                    if (!confirm('Are you sure you want to cancel this order?')) return;
                    try {
                      setCancelling(true);
                      await orderApi.cancel(id);
                      // reload order
                      const updated: any = await orderApi.getById(id);
                      setOrder({
                        id: String(updated.id),
                        status: updated.status,
                        created_at: updated.created_at,
                        total_amount: updated.total_amount,
                      });
                    } catch (err) {
                      console.error(err);
                      alert('Failed to cancel order');
                    } finally {
                      setCancelling(false);
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-border bg-red-600 text-black hover:bg-red-700"
                  disabled={cancelling}
                >
                  {cancelling ? 'Cancelling…' : 'Cancel Order'}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default OrderDetailsPage;
