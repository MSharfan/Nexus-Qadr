const BASE_URL = process.env.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in/v1/external";

let cachedToken = null;
let tokenExpiresAt = 0;

export const isShiprocketConfigured = () =>
  process.env.SHIPROCKET_ENABLED === "true" &&
  Boolean(process.env.SHIPROCKET_EMAIL) &&
  Boolean(process.env.SHIPROCKET_PASSWORD);

const requestJson = async (path, options = {}) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const message = data?.message || data?.error || `Shiprocket request failed with ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
};

export const getShiprocketToken = async () => {
  if (!isShiprocketConfigured()) {
    throw new Error("Shiprocket is not configured");
  }

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const data = await requestJson("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: process.env.SHIPROCKET_EMAIL,
      password: process.env.SHIPROCKET_PASSWORD,
    }),
  });

  cachedToken = data?.token;
  tokenExpiresAt = Date.now() + 9 * 24 * 60 * 60 * 1000;

  if (!cachedToken) {
    throw new Error("Shiprocket auth did not return a token");
  }

  return cachedToken;
};

const authorizedRequest = async (path, options = {}) => {
  const token = await getShiprocketToken();
  return requestJson(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
};

export const checkServiceability = async ({
  pickup_postcode,
  delivery_postcode,
  weight,
  cod = false,
}) => {
  const qs = new URLSearchParams({
    pickup_postcode: String(pickup_postcode),
    delivery_postcode: String(delivery_postcode),
    weight: String(Math.max(Number(weight) || 0.5, 0.5)),
    cod: cod ? "1" : "0",
  });

  return authorizedRequest(`/courier/serviceability/?${qs.toString()}`);
};

export const createAdhocOrder = async (payload) =>
  authorizedRequest("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const assignAwb = async ({ shipment_id, courier_id }) =>
  authorizedRequest("/courier/assign/awb", {
    method: "POST",
    body: JSON.stringify({ shipment_id, courier_id }),
  });

export const generatePickup = async ({ shipment_id }) =>
  authorizedRequest("/courier/generate/pickup", {
    method: "POST",
    body: JSON.stringify({ shipment_id: [shipment_id] }),
  });

export const localShippingEstimate = ({ weight, cod = false }) => {
  const billableWeight = Math.max(Number(weight) || 0.5, 0.5);
  const base = 55;
  const extra = Math.max(0, Math.ceil((billableWeight - 0.5) / 0.5)) * 28;
  const codFee = cod ? 35 : 0;

  return {
    configured: false,
    serviceable: true,
    courier_name: "Local estimate",
    courier_id: null,
    freight_charge: base + extra,
    cod_charge: codFee,
    total_charge: base + extra + codFee,
    estimated_delivery_days: "3-7",
  };
};
