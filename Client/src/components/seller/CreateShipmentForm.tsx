import React, { useState } from "react";
import { deliveryApi } from "../../config/api";
import { toastSuccess, toastError } from "../../utils/toast";

interface Props {
  orderId: string;
  onCreated?: (tracking: any) => void;
}

export const CreateShipmentForm: React.FC<Props> = ({ orderId, onCreated }) => {
  const [courier, setCourier] = useState("Blue Dart");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [eta, setEta] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim()) return toastError("Please enter tracking number");

    setSaving(true);
    try {
      const payload = {
        order_id: orderId,
        tracking_number: trackingNumber.trim(),
        courier_name: courier.trim(),
        estimated_delivery: eta || null,
        initial_status: "in_transit"
      };
      const res = await deliveryApi.create(payload) as { tracking: any };
      toastSuccess("Shipment created");
      if (onCreated) onCreated(res.tracking);
      setTrackingNumber("");
      setEta("");
    } catch (err) {
      console.error(err);
      toastError("Failed to create shipment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <input value={courier} onChange={(e)=>setCourier(e.target.value)} className="p-2 border rounded" />
        <input value={trackingNumber} onChange={(e)=>setTrackingNumber(e.target.value)} placeholder="Tracking number" className="p-2 border rounded" />
      </div>

      <div>
        <input type="datetime-local" value={eta} onChange={(e)=>setEta(e.target.value)} className="p-2 border rounded w-full" />
      </div>

      <div>
        <button type="submit" disabled={saving} className="px-4 py-2 rounded bg-blue-600 text-white">
          {saving ? "Creating…" : "Create Shipment"}
        </button>
      </div>
    </form>
  );
};

export default CreateShipmentForm;