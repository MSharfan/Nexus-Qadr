import { cartApi } from "../config/api";

export interface NormalizedCartItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  item_id?: string;
}

export const fetchCartItems = async (): Promise<NormalizedCartItem[]> => {
  const data: any = await cartApi.get();

  // Backend may return { cart_id, items } OR array
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
  }));
};
