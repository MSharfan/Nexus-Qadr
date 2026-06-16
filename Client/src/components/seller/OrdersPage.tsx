import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Package, Filter, Mail, MapPin, Phone, User } from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

import { orderApi, request, deliveryApi } from "../../config/api";
import { useToast } from "../ui/ToastProvider";
import { OMS_STEPS, TERMINAL_OMS_STATUS_KEYS, mapStatusToOmsKey, omsLabelFromStatus } from "../../utils/omsStatus";

interface SellerOrder {
  id: string;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  address_id?: string;
  total_amount?: number;
  created_at?: string;
  // items may include optional size and color when recorded by the server
  items?: Array<{ product_id: string; title?: string; quantity?: number; price?: number; size?: string | null; color?: string | null }>;
  customer?: {
    id?: string;
    name?: string;
    email?: string;
  } | null;
  shipping_address?: {
    id?: string;
    full_name?: string;
    phone?: string;
    line1?: string;
    line2?: string | null;
    city?: string;
    state?: string | null;
    postal_code?: string;
    country?: string;
  } | null;
}

function toNumber(value: unknown): number | undefined;
function toNumber(value: unknown, fallback: number): number;
function toNumber(value: unknown, fallback?: number) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

const formatMoney = (value?: number) =>
  typeof value === "number" ? `Rs. ${value.toFixed(2)}` : "-";

const getAddressLines = (address?: SellerOrder["shipping_address"]) => {
  if (!address) return [];

  return [
    [address.line1, address.line2].filter(Boolean).join(", "),
    [address.city, address.state, address.postal_code].filter(Boolean).join(", "),
    address.country,
  ].filter(Boolean);
};

const SellerOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentRole = location.pathname.startsWith("/admin")
    ? "admin"
    : (localStorage.getItem("role") || "seller").toLowerCase();

  const [orders, setOrders] = React.useState<SellerOrder[]>([]);
  const [detailOrder, setDetailOrder] = React.useState<SellerOrder | null>(null);
  const [trackingInfo, setTrackingInfo] = React.useState<null | { tracking: any; history: any[] }>(null);
  // order id for which delivery lookup returned 404 / no tracking yet
  const [trackingUnavailableOrderId, setTrackingUnavailableOrderId] = React.useState<string | null>(null);
  const [filterStatus, setFilterStatus] = React.useState("all");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [modalLoading, setModalLoading] = React.useState(false);
  const toast = useToast();

  // Helper: resolve attribute from a few possible shapes the server might return
  const resolveAttr = (it: any, key: 'size' | 'color') => {
    if (!it) return null;
    // direct
    if (it[key] !== undefined && it[key] !== null) return it[key];
    // top-level may be strings encoded (when DB returns JSON text)
    if (typeof it === 'string') {
      try {
        const parsed = JSON.parse(it);
        if (parsed && (parsed[key] !== undefined)) return parsed[key];
      } catch {}
    }
    // nested product object
    if (it.product && (it.product[key] !== undefined)) return it.product[key];
    // common fallback structures
    if (it.attributes && (it.attributes[key] !== undefined)) return it.attributes[key];
    if (it.options && (it.options[key] !== undefined)) return it.options[key];
    return null;
  };

  /* ===========================
     LOAD SELLER ORDERS
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const rows: any[] =
          currentRole === "admin"
            ? await orderApi.adminOrders()
            : await orderApi.sellerOrders();

        const mapped: SellerOrder[] = rows.map((o: any) => {
          // server may return order_id or id and seller_total or total_amount
          const id = String(o.order_id ?? o.id ?? "");
          const items = Array.isArray(o.items) ? o.items : (o.items ? JSON.parse(o.items) : []);
          const explicitTotal = toNumber(o.seller_total ?? o.total_amount ?? o.total);
          const itemsTotal = Array.isArray(items)
            ? items.reduce((sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity, 1), 0)
            : 0;
          return {
            id,
            status: typeof o.status === "string" ? o.status : "placed",
            payment_status: typeof o.payment_status === "string" ? o.payment_status : undefined,
            payment_method: typeof o.payment_method === "string" ? o.payment_method : undefined,
            address_id: o.address_id ? String(o.address_id) : undefined,
            total_amount: explicitTotal ?? (itemsTotal > 0 ? itemsTotal : undefined),
            created_at: o.created_at,
            items,
            customer: o.customer ?? null,
            shipping_address: o.shipping_address ?? null,
          } as SellerOrder;
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
  }, [currentRole]);

  /* ===========================
     UPDATE STATUS
  =========================== */
  const updateStatus = async (orderId: string, status: string) => {
    try {
      await request(`/order/${orderId}/status`, {
        method: "PUT",
        body: { status },
      });

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, status } : o
        )
      );
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTrackingForOrder = async (orderId: string) => {
    try {
      setModalLoading(true);
      setError(null);
      setTrackingInfo(null);
      // clear any previous "no tracking" marker
      setTrackingUnavailableOrderId(null);
      const data: any = await deliveryApi.byOrder(orderId);
      // deliveryApi.byOrder may return null when allowNotFound is true
      if (!data) {
        // No tracking found for this order yet — show items and a subtle inline message
        setTrackingInfo(null);
        setTrackingUnavailableOrderId(orderId);
        const ord = orders.find((o) => o.id === orderId) ?? null;
        setDetailOrder(ord ?? null);
        return;
      }

      // server returns { tracking, history }
      setTrackingInfo({ tracking: data.tracking, history: data.history ?? [] });
      // open modal for details (reuse detailOrder modal area) - set detailOrder also so order items visible
      const ord = orders.find((o) => o.id === orderId) ?? null;
      setDetailOrder(ord ?? null);
      toast({ type: "success", title: "Tracking loaded", description: "Delivery tracking loaded" });
    } catch (err: any) {
      // If this was an expected 404 (allowNotFound) it will be handled above; otherwise log only in dev
      if ((import.meta as any).env?.DEV) console.debug("Fetch tracking failed", err);
      // If server forbids byOrder (customer-only), do not call non-existent seller-list APIs; surface a clear error instead.
      const isForbidden = err?.status === 403 || String(err?.message ?? "").toLowerCase().includes("forbidden");
      if (isForbidden) {
        // The deliveryApi does not expose a seller-specific listing method here, so avoid calling it.
        setError("Access to tracking is forbidden or not available");
        toast({ type: "error", title: "Tracking unavailable", description: "Access to tracking information is forbidden or not available for this order" });
      } else {
        setError(err?.message || "Failed to fetch tracking");
        toast({ type: "error", title: "Tracking error", description: err?.message || "Failed to fetch tracking" });
      }
      setTrackingInfo(null);
      setDetailOrder(orders.find((o) => o.id === orderId) ?? null);
      setTrackingUnavailableOrderId(null);
    } finally {
      setModalLoading(false);
    }
  };

  const filteredOrders =
    filterStatus === "all"
      ? orders
      : orders.filter((o) => {
          const key = mapStatusToOmsKey(o.status);
          if (filterStatus === "pending" || filterStatus === "placed") {
            return key === "order_created";
          }
          return key === filterStatus;
        });

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
     UI
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl mb-1">Orders</h1>
              <p className="text-muted-foreground">
                Manage customer orders
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 rounded-xl border border-border bg-secondary"
              >
                <option value="all">All</option>
                <option value="placed">Order Created</option>
                <option value="pending">Order Pending</option>
                <option value="payment_confirmed">Payment Confirmed</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="in_transit">In Transit</option>
                <option value="out_for_delivery">Out for Delivery</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
                <option value="returned">Returned</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredOrders.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p>No orders found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1a1a1a] rounded-xl border border-border overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary">
                  <tr>
                    <th className="text-left px-6 py-4">Order ID</th>
                    <th className="text-left px-6 py-4">Date</th>
                    <th className="text-left px-6 py-4">Products</th>
                    <th className="text-left px-6 py-4">Attrs</th>
                    <th className="text-left px-6 py-4">Ship To</th>
                    <th className="text-left px-6 py-4">Amount</th>
                    <th className="text-left px-6 py-4">OMS Status</th>
                    <th className="text-left px-6 py-4">Update</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((o) => (
                    <tr
                      key={o.id}
                      className="border-t border-border"
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => {
                            setTrackingInfo(null);
                            setDetailOrder(o);
                            fetchTrackingForOrder(o.id);
                          }}
                          className="text-left text-sm text-[#0D47A1] hover:underline"
                        >
                          #{o.id}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}
                      </td>
                      {/* Products column: render each item as a block */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-3">
                          {(o.items ?? []).map((it, idx) => (
                            <div key={idx} className="flex items-start gap-3">
                              <button
                                onClick={() => {
                                  const pid = it.product_id ?? null;
                                  if (pid) {
                                    navigate(`/product/${String(pid)}`);
                                  } else {
                                    setTrackingInfo(null);
                                    setDetailOrder(o);
                                  }
                                }}
                                className="text-left text-sm text-[#0D47A1] hover:underline flex-1"
                              >
                                <div className="font-medium">{it.title ?? `Product ${it.product_id}`}</div>
                                <div className="text-xs text-muted-foreground">Qty: {it.quantity ?? 1}</div>
                              </button>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Attrs column: per-item attrs aligned to each product block */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-col gap-3">
                          {(o.items ?? []).map((it, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              {(() => {
                                const sz = resolveAttr(it, 'size');
                                const col = resolveAttr(it, 'color');
                                if (!sz && !col) return <span className="text-sm text-muted-foreground">—</span>;
                                return (
                                  <div className="flex items-center gap-2">
                                    {sz && (
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                                        Size: {sz}
                                      </span>
                                    )}
                                    {col && (
                                      <span className="flex items-center gap-2 text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">
                                        <span
                                          className="w-3 h-3 rounded-full border"
                                          style={{ backgroundColor: String(col || '').trim() || undefined }}
                                        />
                                        <span>{String(col)}</span>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 min-w-56">
                        {o.shipping_address ? (
                          <div className="space-y-1 text-sm">
                            <div className="font-medium">
                              {o.shipping_address.full_name || o.customer?.name || "Customer"}
                            </div>
                            <div className="text-muted-foreground">
                              {[o.shipping_address.city, o.shipping_address.state, o.shipping_address.postal_code]
                                .filter(Boolean)
                                .join(", ") || "Address available"}
                            </div>
                            {o.shipping_address.phone && (
                              <div className="text-muted-foreground">{o.shipping_address.phone}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No address</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-[#0D47A1] dark:text-[#00B0FF]">
                        {formatMoney(o.total_amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="text-sm font-medium">
                            {omsLabelFromStatus(o.status)}
                          </div>
                          <button
                            onClick={() => {
                              setTrackingInfo(null);
                              setDetailOrder(o);
                            }}
                            className="text-left text-xs text-[#0D47A1] hover:underline"
                          >
                            View details
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {currentRole === "customer" ? (
                          <div className="text-sm text-muted-foreground">No actions</div>
                        ) : (
                          (() => {
                            // determine allowed status transitions by role
                            let allowedKeys: string[] = [];
                            if (currentRole === "admin") {
                              allowedKeys = OMS_STEPS.map((s) => s.key);
                            } else if (currentRole === "seller") {
                              allowedKeys = ["processing", "packed", "shipped"];
                            } else if (currentRole === "delivery_partner" || currentRole === "delivery") {
                              allowedKeys = ["in_transit", "out_for_delivery", "delivered"];
                            } else {
                              // fallback: seller-level permissions
                              allowedKeys = ["processing", "packed", "shipped"];
                            }

                            const currentValue = allowedKeys.includes(mapStatusToOmsKey(o.status)) ? mapStatusToOmsKey(o.status) : "";

                            return (
                              <select
                                value={currentValue}
                                onChange={(e) => updateStatus(o.id, e.target.value)}
                                className="px-3 py-2 rounded-lg border border-border bg-secondary"
                              >
                                <option value="" disabled>
                                  Update status
                                </option>
                                {OMS_STEPS.filter((s) => allowedKeys.includes(s.key)).map((s) => (
                                  <option key={s.key} value={s.key}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                            );
                          })()
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Order details modal */}
          {detailOrder && (
            <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/40 py-6 md:py-0">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl w-full max-w-4xl overflow-y-auto p-6 border border-border" style={{ maxHeight: 'calc(100dvh - 120px)', WebkitOverflowScrolling: 'touch' }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl">Order #{detailOrder.id} Details</h3>
                  <button
                    onClick={() => {
                      setTrackingInfo(null);
                      setDetailOrder(null);
                    }}
                    className="px-3 py-1 rounded border"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">Date: {detailOrder.created_at ? new Date(detailOrder.created_at).toLocaleString() : '-'}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 text-sm font-medium mb-3">
                        <User className="w-4 h-4 text-[#00B0FF]" />
                        Customer
                      </div>
                      <div className="space-y-2 text-sm">
                        <div>{detailOrder.customer?.name || detailOrder.shipping_address?.full_name || "Customer"}</div>
                        {detailOrder.customer?.email && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-4 h-4" />
                            <span>{detailOrder.customer.email}</span>
                          </div>
                        )}
                        {detailOrder.shipping_address?.phone && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            <span>{detailOrder.shipping_address.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border border-border">
                      <div className="flex items-center gap-2 text-sm font-medium mb-3">
                        <MapPin className="w-4 h-4 text-[#00B0FF]" />
                        Delivery Address
                      </div>
                      {detailOrder.shipping_address ? (
                        <div className="space-y-1 text-sm">
                          <div className="font-medium">
                            {detailOrder.shipping_address.full_name || detailOrder.customer?.name || "Customer"}
                          </div>
                          {getAddressLines(detailOrder.shipping_address).map((line, index) => (
                            <div key={index} className="text-muted-foreground">
                              {line}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">No delivery address is attached to this order.</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">OMS Status</div>
                    <div className="flex flex-col gap-2">
                      {OMS_STEPS.map((s, idx) => {
                        const currentKey = mapStatusToOmsKey(detailOrder.status);
                        const currentIdx = OMS_STEPS.findIndex((x) => x.key === currentKey);
                        const isTerminal = TERMINAL_OMS_STATUS_KEYS.includes(currentKey);
                        const isTerminalStep = TERMINAL_OMS_STATUS_KEYS.includes(s.key);
                        if (!isTerminal && isTerminalStep) return null;
                        const isActive = s.key === currentKey;
                        const isDone = !isTerminal && idx <= currentIdx;
                        return (
                          <div key={s.key} className="flex items-center gap-3">
                            <div
                              className={[
                                "w-2.5 h-2.5 rounded-full",
                                isActive ? "bg-[#00B0FF]" : isDone ? "bg-green-500" : "bg-gray-300",
                              ].join(" ")}
                            />
                            <div className={isActive ? "font-medium" : "text-muted-foreground"}>
                              {s.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {modalLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin border-primary" />
                        <div className="text-sm text-muted-foreground">Loading tracking…</div>
                      </div>
                    </div>
                  ) : (
                    // If trackingUnavailableOrderId matches, show inline notice instead of a toast
                    trackingInfo ? (
                    <div>
                      <h4 className="mb-2">Delivery Tracking</h4>
                      <div className="p-3 rounded border border-border mb-3">
                        <div><strong>Tracking #:</strong> {trackingInfo.tracking.tracking_number ?? '—'}</div>
                        <div><strong>Courier:</strong> {trackingInfo.tracking.courier_name ?? '—'}</div>
                        <div><strong>Status:</strong> {trackingInfo.tracking.status ? omsLabelFromStatus(trackingInfo.tracking.status) : '—'}</div>
                        <div><strong>Current location:</strong> {trackingInfo.tracking.current_location ?? '—'}</div>
                        <div><strong>Estimated delivery:</strong> {trackingInfo.tracking.estimated_delivery ?? '—'}</div>
                      </div>

                      <h5 className="mb-2">Status History</h5>
                      <div className="space-y-2">
                        {(trackingInfo.history ?? []).map((h, i) => (
                          <div key={i} className="p-2 rounded border border-border">
                            <div className="text-sm"><strong>{omsLabelFromStatus(h.status)}</strong> <span className="text-muted-foreground">— {h.source ?? 'system'}</span></div>
                            <div className="text-xs text-muted-foreground">{h.note ?? ''} {h.location ? `• ${h.location}` : ''}</div>
                            <div className="text-xs text-muted-foreground">{h.created_at ? new Date(h.created_at).toLocaleString() : ''}</div>
                          </div>
                        ))}
                        {((trackingInfo.history ?? []).length === 0) && (
                          <div className="text-muted-foreground">No history available</div>
                        )}
                      </div>
                    </div>
                    ) : (
                    <div>
                      {trackingUnavailableOrderId === detailOrder.id && (
                        <div className="mb-3 p-3 rounded border border-yellow-300 bg-yellow-50 text-sm text-yellow-800">
                          Delivery tracking is not available for this order yet.
                        </div>
                      )}
                      <h4 className="mb-2">Items</h4>
                      <div className="space-y-2">
                        {(detailOrder.items ?? []).map((it, i) => (
                          <div key={i} className="flex items-center justify-between p-3 rounded border border-border">
                            <div>
                              <div className="font-medium">{it.title ?? `Product ${it.product_id}`}</div>
                              <div className="text-sm text-muted-foreground">Qty: {it.quantity ?? 1}</div>
                              {((resolveAttr(it, 'size') && String(resolveAttr(it, 'size')).trim()) || (resolveAttr(it, 'color') && String(resolveAttr(it, 'color')).trim())) && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {resolveAttr(it, 'size') ? `Size: ${resolveAttr(it, 'size')}` : ''}{resolveAttr(it, 'size') && resolveAttr(it, 'color') ? ' • ' : ''}{resolveAttr(it, 'color') ? `Color: ${resolveAttr(it, 'color')}` : ''}
                                </div>
                              )}
                            </div>
                            <div className="text-[#0D47A1]">{formatMoney(toNumber(it.price) ?? 0)}</div>
                          </div>
                        ))}
                        
                      </div>
                    </div>
                    )
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SellerOrdersPage;
