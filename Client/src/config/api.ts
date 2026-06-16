// src/config/api.ts

const BASE_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:5000";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

interface ApiRequestOptions {
  method?: HttpMethod;
  body?: unknown;
  auth?: boolean;
  suppressToast?: boolean;
  allowNotFound?: boolean;
}

interface ApiError extends Error {
  status?: number;
}

function getToken(): string | null {
  return localStorage.getItem("token");
}

export async function request<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = true,
    suppressToast = false,
    allowNotFound = false,
  } = options;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // If consumer asked to allowNotFound, handle 404 immediately and avoid parsing error bodies
  if (allowNotFound && response.status === 404) {
    return null as T;
  }

  if (!response.ok) {
    if (allowNotFound && response.status === 404) {
      return null as T;
    }

    if (response.status === 401) {
      localStorage.removeItem("token");
    }

    const error: ApiError = new Error("API request failed");
    error.status = response.status;

    try {
      const data = await response.json();
      // Prefer explicit 'error' (detailed server error) falling back to message
      error.message = data?.error || data?.message || error.message;
    } catch {}

    // show toast for API errors (non-blocking)
    if (!suppressToast) {
      try {
        // use Sonner so styling matches light/dark theme
        const { toast } = await import("sonner");
        toast.error(error.message || "API Error");
      } catch (e) {
        // fallback to custom provider if sonner import fails
        try {
          const { toastService } = await import("../components/ui/toastService");
          toastService.notify({
            type: "error",
            title: error.message || "API Error",
          });
        } catch {
          // swallow - not critical
        }
      }
    }

    throw error;
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

/* ===========================
   AUTH
=========================== */

export const authApi = {
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user?: { roles?: string[] } }>("/auth/login", {
      method: "POST",
      body: data,
      auth: false,
    }),

  register: (data: {
    name: string;
    email: string;
    password: string;
    role: "customer" | "seller";
  }) =>
    request<{ token: string }>("/auth/register", {
      method: "POST",
      body: data,
      auth: false,
    }),
};


/* ===========================
   PRODUCTS
=========================== */

export const productApi = {
  getAll: (query?: string) =>
    request<any[]>(query ? `/product?${query}` : "/product"),

  getById: async (id: string) => {
    try {
      return await request<any>(`/product/${id}`);
    } catch (err: any) {
      if (err.status === 404) {
        const all = await request<any[]>("/product");
        const found = all.find((p) => String(p.id) === String(id));
        if (!found) throw err;
        return found;
      }
      throw err;
    }
  },
  toggleTrending: (id: string, is_trending: boolean) =>
    request(`/admin/product/${id}/trending`, { method: "PUT", body: { is_trending } }),
};

/* ===========================
   CART
=========================== */

export const cartApi = {
  // server returns { cart_id, items: [...], total }
  get: () => request<any>("/cart"),

  add: (data: { product_id: string; quantity: number; size?: string; color?: string }) =>
    request("/cart/add", { method: "POST", body: data }),

  // update expects cart item id in route
  update: (itemId: string, quantity: number) =>
    request(`/cart/item/${itemId}`, { method: "PUT", body: { quantity } }),

  // remove by cart item id
  remove: (itemId: string) =>
    request(`/cart/item/${itemId}`, { method: "DELETE" }),
};


/* ===========================
   ORDERS (CUSTOMER + SELLER)
=========================== */

export const orderApi = {
  create: (data: unknown) =>
    request("/order", { method: "POST", body: data }),
  myOrders: () => request<any[]>("/order/my"),

  sellerOrders: () => request<any[]>("/order/seller"),
  adminOrders: () => request<any[]>("/admin/orders"),

  // GET /order/:id (role-safe)
  getById: (id: string) => request<any>(`/order/${id}`),

  // Cancel order (customer)
  cancel: (id: string) => request(`/order/${id}/cancel`, { method: "PUT" }),
};

/* ===========================
   SHIPPING
=========================== */

export const shippingApi = {
  quote: (data: { delivery_postcode: string; delivery_country?: string; payment_method: "card" | "upi" | "cod" }) =>
    request<{
      configured: boolean;
      serviceable: boolean;
      total_shipping: number;
      quotes: any[];
    }>("/shipping/quote", { method: "POST", body: data, suppressToast: true }),
};

/* ===========================
   DELIVERY
=========================== */

export const deliveryApi = {
  byOrder: (orderId: string) =>
    request(`/delivery/order/${orderId}`, {
      suppressToast: true,
      allowNotFound: true,
    }),

  // POST /delivery/create
create: (data: {
  order_id: string;
  tracking_number: string;
  courier_name?: string;
  estimated_delivery?: string | null;
}) => request("/delivery/create", { method: "POST", body: data }),

// PUT /delivery/update/:tracking_id
update: (trackingId: string, data: { status?: string; current_location?: any; note?: string }) =>
  request(`/delivery/update/${trackingId}`, { method: "PUT", body: data }),

// POST /delivery/history/:tracking_id
addHistory: (trackingId: string, data: { status: string; location?: any; note?: string }) =>
  request(`/delivery/history/${trackingId}`, { method: "POST", body: data }),

// Demo webhook (dev only)
demoBlueDart: (data: { tracking_number: string; status: string; location?: any; note?: string }) =>
  request(`/delivery/webhook/demo/bluedart`, { method: "POST", body: data, auth: false }),
};

/* ===========================
   WISHLIST
=========================== */

export const wishlistApi = {
  get: () => request<any[]>("/wishlist"),

  add: (productId: string) =>
    request("/wishlist/add", {
      method: "POST",
      body: { product_id: productId },
    }),

  remove: (productId: string) =>
    request(`/wishlist/remove/${productId}`, { method: "DELETE" }),

  check: (productId: string) =>
    request<{ exists: boolean }>(`/wishlist/check/${productId}`),
};

/* ===========================
   SAVED FOR LATER
=========================== */

export const savedLaterApi = {
  get: () => request<any[]>("/savedlater"),

  add: (productId: string) =>
    request("/savedlater/add", {
      method: "POST",
      body: { product_id: productId },
    }),

  remove: (productId: string) =>
    request(`/savedlater/remove/${productId}`, { method: "DELETE" }),
};

/* ===========================
   REVIEWS
=========================== */

export const reviewApi = {
  getByProduct: (productId: string) =>
    request<any[]>(`/review/product/${productId}`),

  add: (data: unknown) =>
    request("/review", { method: "POST", body: data }),
};

/* ===========================
   SEARCH
=========================== */

export const searchApi = {
  search: (params: { q?: string; category?: string; trending?: boolean; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params.q) qs.set("q", params.q);
    if (params.category) qs.set("category", params.category);
    if (typeof params.trending === "boolean") qs.set("trending", String(params.trending));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));
    return request<{ products: any[] }>(`/search?${qs.toString()}`);
  },
  suggest: (q: string, limit = 8) =>
    request<any[]>(`/search/suggest?q=${encodeURIComponent(q)}&limit=${limit}`, { suppressToast: true, allowNotFound: true }),
};

/* ===========================
   CATEGORIES
=========================== */

export const categoryApi = {
  getAll: () => request<any[]>("/category"),
};

/* ===========================
   ADDRESSES
=========================== */

export const addressApi = {
  getAll: () => request<any[]>("/address"),

  add: (data: {
    label?: string;
    full_name: string;
    phone: string;
    line1: string;
    line2?: string | null;
    city: string;
    state?: string | null;
    postal_code: string;
    country: string;
    type?: string;
    proof_url?: string | null;
  }) =>
    request<{ address: any }>("/address", {
      method: "POST",
      body: data,
    }),
  
  update: (id: string, data: any) =>
    request(`/address/${id}`, { method: "PUT", body: data }),

  remove: (id: string) => request(`/address/${id}`, { method: "DELETE" }),

  setDefault: (id: string) => request(`/address/default/${id}`, { method: "PUT" }),
};

/* ===========================
   USER
=========================== */

export const userApi = {
  getProfile: () => request<any>("/user"),
  updateProfile: (data: { name?: string; email?: string }) =>
    request("/user", { method: "PUT", body: data }),
  // ADMIN: list users with optional role filter
  adminList: (role?: string) => request<any[]>(role ? `/admin/users?role=${encodeURIComponent(role)}` : `/admin/users`),
  // ADMIN: block / unblock user by id
  // Server routes: PUT /admin/block/:id and PUT /admin/unblock/:id
  adminBlock: (userId: string, block: boolean) =>
    // block === true => call /admin/block/:id, otherwise call /admin/unblock/:id
    request(block ? `/admin/block/${userId}` : `/admin/unblock/${userId}`, { method: "PUT" }),
  // ADMIN: block / unblock specific role for a user
  adminBlockRole: (userId: string, role: string, block: boolean) =>
    request(block ? `/admin/block-role/${userId}?role=${encodeURIComponent(role)}` : `/admin/unblock-role/${userId}?role=${encodeURIComponent(role)}`, { method: "PUT" }),
};

/* ===========================
   PASSWORD
=========================== */

export const passwordApi = {
  forgot: (email: string) =>
    request("/password/forgot-password", {
      method: "POST",
      body: { email },
      auth: false,
    }),

  reset: (token: string, password: string) =>
    request("/password/reset-password", {
      method: "POST",
      body: { token, newPassword: password },
      auth: false,
    }),
};

/* ===========================
   BANNER
=========================== */

export const bannerApi = {
  // GET /banner
  get: () => request<any>(`/banner`, { suppressToast: true, allowNotFound: true }),
  // PUT /banner (admin)
  update: (data: any) => request(`/banner`, { method: 'PUT', body: data }),
};


/* ===========================
   SELLER EARNINGS
=========================== */

export const sellerEarningsApi = {
  summary: () => request("/sellerearnings/summary"),
};

/* ===========================
   SELLER
=========================== */

export const sellerApi = {
  getDocuments: () => request<any>("/seller/documents"),
  saveDocuments: (data: any) => request("/seller/documents", { method: "POST", body: data }),
};

