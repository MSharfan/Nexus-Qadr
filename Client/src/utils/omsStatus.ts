export const OMS_STEPS = [
  { key: "order_created", label: "Order Created" },
  { key: "payment_confirmed", label: "Payment Confirmed" },
  { key: "processing", label: "Processing" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "in_transit", label: "In Transit" },
  { key: "out_for_delivery", label: "Out for Delivery" },
  { key: "delivered", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
  { key: "returned", label: "Returned" },
  { key: "refunded", label: "Refunded" },
] as const;

export type OmsStatusKey = (typeof OMS_STEPS)[number]["key"];

export const TERMINAL_OMS_STATUS_KEYS: OmsStatusKey[] = [
  "cancelled",
  "returned",
  "refunded",
];

const normalizeStatus = (status?: string | null) =>
  String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const mapStatusToOmsKey = (status?: string | null): OmsStatusKey => {
  const s = normalizeStatus(status);

  if (["placed", "pending", "ordered", "created", "order_created"].includes(s)) return "order_created";
  if (["payment_confirmed", "payment_completed", "payment_success", "paid", "confirmed"].includes(s)) {
    return "payment_confirmed";
  }
  if (["processing", "process"].includes(s)) return "processing";
  if (["packed", "order_ready", "ready", "ready_to_ship"].includes(s)) return "packed";
  if (["shipped", "shipment_created", "dispatch", "dispatched"].includes(s)) return "shipped";
  if (["in_transit", "intransit", "transit"].includes(s)) return "in_transit";
  if (["out_for_delivery", "outfordelivery"].includes(s)) return "out_for_delivery";
  if (["delivered", "complete", "completed"].includes(s)) return "delivered";
  if (["cancelled", "canceled"].includes(s)) return "cancelled";
  if (["returned", "return"].includes(s)) return "returned";
  if (["refunded", "refund"].includes(s)) return "refunded";

  return "order_created";
};

export const omsLabelFromStatus = (status?: string | null) => {
  const key = mapStatusToOmsKey(status);
  return OMS_STEPS.find((step) => step.key === key)?.label ?? "Order Created";
};

export const isTerminalOmsStatus = (status?: string | null) =>
  TERMINAL_OMS_STATUS_KEYS.includes(mapStatusToOmsKey(status));

export const isTrackableOmsStatus = (status?: string | null) => {
  const key = mapStatusToOmsKey(status);
  return ["shipped", "in_transit", "out_for_delivery", "delivered", "returned", "refunded"].includes(key);
};

export const canCustomerCancelOrder = (status?: string | null) => {
  const key = mapStatusToOmsKey(status);
  if (TERMINAL_OMS_STATUS_KEYS.includes(key)) return false;

  const shippedIndex = OMS_STEPS.findIndex((step) => step.key === "shipped");
  const currentIndex = OMS_STEPS.findIndex((step) => step.key === key);
  return currentIndex >= 0 && currentIndex < shippedIndex;
};
