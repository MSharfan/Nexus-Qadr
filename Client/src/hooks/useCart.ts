import { useCallback, useEffect, useState } from "react";
import { cartApi } from "../config/api";

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

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cartApi.get();
      setItems(normalizeCart(data));
    } catch (err) {
      console.error(err);
      setError("Failed to load cart");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // listen for global cart updates
  useEffect(() => {
    const onUpdate = () => fetchCart();
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
    refresh: fetchCart,
    setItems, // exposed for optimistic updates (advanced use)
  };
};
