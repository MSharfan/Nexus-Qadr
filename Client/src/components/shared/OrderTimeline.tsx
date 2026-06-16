import React from "react";
import { Check, Package, Box, Truck, XCircle } from "lucide-react";
import {
  OMS_STEPS,
  TERMINAL_OMS_STATUS_KEYS,
  mapStatusToOmsKey,
  omsLabelFromStatus,
  type OmsStatusKey,
} from "../../utils/omsStatus";

type TimelineStep = {
  key: OmsStatusKey;
  label: string;
  icon: React.ReactNode;
};

interface Props {
  currentStatus?: string | null;
  createdAt?: string | null;
  // delivery may contain updated_at and possibly more granular info in the future
  delivery?: { status?: string | null; updated_at?: string | null } | null;
}

const stepIcons: Record<OmsStatusKey, React.ReactNode> = {
  order_created: <Package className="w-5 h-5" />,
  payment_confirmed: <Check className="w-5 h-5" />,
  processing: <Box className="w-5 h-5" />,
  packed: <Box className="w-5 h-5" />,
  shipped: <Truck className="w-5 h-5" />,
  in_transit: <Truck className="w-5 h-5" />,
  out_for_delivery: <Truck className="w-5 h-5" />,
  delivered: <Check className="w-5 h-5" />,
  cancelled: <XCircle className="w-5 h-5" />,
  returned: <XCircle className="w-5 h-5" />,
  refunded: <XCircle className="w-5 h-5" />,
};

const steps: TimelineStep[] = OMS_STEPS
  .filter((step) => !TERMINAL_OMS_STATUS_KEYS.includes(step.key))
  .map((step) => ({
    ...step,
    icon: stepIcons[step.key],
  }));

const OrderTimeline: React.FC<Props> = ({ currentStatus, createdAt, delivery }) => {
  const currentKey = mapStatusToOmsKey(currentStatus);

  // If the order is cancelled/returned/refunded, show a cancelled banner
  const isTerminal = TERMINAL_OMS_STATUS_KEYS.includes(currentKey);

  // Map current status to the highest completed step index
  const currentIndex = steps.findIndex((s) => s.key === currentKey);
  const completedIndex = currentIndex >= 0 ? currentIndex : 0;

  // Helper for formatting date; prefer precise per-step date if available
  const dateFor = (stepKey: string) => {
    if (stepKey === "order_created" && createdAt) return new Date(createdAt).toLocaleDateString();
    if (["shipped", "in_transit", "out_for_delivery", "delivered"].includes(stepKey) && delivery?.updated_at)
      return new Date(delivery.updated_at).toLocaleDateString();
    return null;
  };

  return (
    <div className="flex gap-6">
      <div className="w-0.5 bg-border" />
      <div className="flex-1">
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-border">
          {isTerminal && (
            <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 flex items-center gap-3">
              <XCircle className="w-5 h-5" />
              <div>
                <div className="font-medium">{omsLabelFromStatus(currentStatus)}</div>
                {createdAt && (
                  <div className="text-sm text-muted-foreground">Placed on {new Date(createdAt).toLocaleString()}</div>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-col">
            {steps.map((step, i) => {
              const done = !isTerminal && i <= completedIndex;
              const date = dateFor(step.key);

              return (
                <div key={step.key} className="flex items-start gap-4 py-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? "bg-[#00B0FF] text-white" : "bg-muted-foreground text-white/60"}`}
                    >
                      {done ? <Check className="w-4 h-4" /> : step.icon}
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`w-px flex-1 ${done ? "bg-[#00B0FF]" : "bg-border"} mt-2`} />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{step.label}</div>
                      {date && <div className="text-sm text-muted-foreground">{date}</div>}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTimeline;
