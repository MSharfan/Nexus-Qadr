import { useCallback, useEffect, useState } from "react";
import { cartApi } from "../config/api";

const CART_CACHE_KEY = "nexus_qadr_cart_cache_v1";

export interface CartItem {
  product_id: string;
  item_id?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  size?: string;
  color?: string;
}

const normalizeCart = (data: any): CartItem[] => {
  const rawItems: any[] = Array.isArray(data)
    ? data
    : data?.items ?? [];

  return rawItems.map((i: any) => ({
    product_id: String(i.product_id ?? i.id),
    item_id: i.cart_item_id || i.id
      ? String(i.cart_item_id ?? i.id)
      : undefined,
    name: i.title ?? i.name ?? "Unnamed product",
    price: Number(i.price ?? 0),
    quantity: Number(i.quantity ?? 1),
    image:
      typeof i.image_url === "string"
        ? i.image_url
        : typeof i.image === "string"
          ? i.image
          : undefined,
    size: typeof i.size === "string" ? i.size : undefined,
    color: typeof i.color === "string" ? i.color : undefined,
  }));
};

const readCartCache = (): CartItem[] => {
  if (typeof window === "undefined") return [];

  try {
    const raw = sessionStorage.getItem(CART_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeCartCache = (nextItems: CartItem[]) => {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(CART_CACHE_KEY, JSON.stringify(nextItems));
  } catch {
    // ignore cache write failures
  }
};

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>(() => readCartCache());
  const [loading, setLoading] = useState(() => readCartCache().length === 0);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async (force = false) => {
    const cachedItems = readCartCache();
    if (!force && cachedItems.length > 0 && items.length > 0) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await cartApi.get();
      const nextItems = normalizeCart(data);
      setItems(nextItems);
      writeCartCache(nextItems);
    } catch (err) {
      console.error(err);
      setError("Failed to load cart");
      if (items.length === 0) {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [items.length]);

  useEffect(() => {
    const cachedItems = readCartCache();
    if (cachedItems.length > 0) {
      setItems(cachedItems);
      setLoading(false);
      return;
    }

    void fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    writeCartCache(items);
  }, [items]);

  // listen for global cart updates
  useEffect(() => {
    const onUpdate = () => void fetchCart(true);
    window.addEventListener("cart-updated", onUpdate);
    return () => window.removeEventListener("cart-updated", onUpdate);
  }, [fetchCart]);

  const totalQuantity = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return {
    items,
    loading,
    error,
    totalQuantity,
    totalAmount,
    refresh: () => fetchCart(true),
    setItems, // exposed for optimistic updates (advanced use)
  };
};
