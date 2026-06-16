import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { ImageWithFallback } from "../shared/ImageWithFallback";

import { cartApi, savedLaterApi, wishlistApi } from "../../config/api";
import { toastError, toastSuccess } from "../../utils/toast";
import { useCart } from "../../hooks/useCart";

type SavedProduct = {
  product_id: string;
  name: string;
  image?: string;
  price: number;
  raw?: any;
};

const normalizeProductRows = (data: any[]): SavedProduct[] =>
  (data || []).map((p: any) => ({
    product_id: String(p.product_id ?? p.id),
    name: p.title || p.name || "Unnamed product",
    image: p.image_url || p.image || p.imageUrl,
    price: Number(p.price ?? 0),
    raw: p,
  }));

const CartPage: React.FC = () => {
  const navigate = useNavigate();

  const { items, loading, error, totalAmount, refresh } = useCart();

  const [saved, setSaved] = useState<SavedProduct[]>([]);
  const [wishlist, setWishlist] = useState<SavedProduct[]>([]);
  const [listView, setListView] = useState<"saved" | "wishlist">("saved");
  const [savingIds, setSavingIds] = useState<Record<string, boolean>>({});

  const fetchSaved = async () => {
    try {
      const data = await savedLaterApi.get();
      setSaved(normalizeProductRows(data));
    } catch (err) {
      console.error("Failed to fetch saved items", err);
    }
  };

  const fetchWishlist = async () => {
    try {
      const data = await wishlistApi.get();
      setWishlist(normalizeProductRows(data));
    } catch (err) {
      console.error("Failed to fetch wishlist", err);
    }
  };

  useEffect(() => {
    fetchSaved();
    fetchWishlist();
  }, []);

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return;

    try {
      await cartApi.update(itemId, quantity);
      await refresh();
      window.dispatchEvent(new Event("cart-updated"));
    } catch (err) {
      console.error(err);
      toastError("Failed to update quantity");
    }
  };

  const removeItem = async (itemId: string) => {
    try {
      await cartApi.remove(itemId);
      await refresh();
      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Item removed from cart");
    } catch (err) {
      console.error(err);
      toastError("Failed to remove item");
    }
  };

  const saveForLater = async (productId: string, itemId?: string) => {
    try {
      setSavingIds((s) => ({ ...s, [`saved-${productId}`]: true }));
      await savedLaterApi.add(productId);
      if (itemId) await cartApi.remove(itemId);
      await refresh();
      await fetchSaved();
      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Saved for later");
    } catch (err) {
      console.error(err);
      toastError("Failed to save item for later");
    } finally {
      setSavingIds((s) => ({ ...s, [`saved-${productId}`]: false }));
    }
  };

  const moveSavedToCart = async (productId: string) => {
    try {
      setSavingIds((s) => ({ ...s, [productId]: true }));
      await cartApi.add({ product_id: productId, quantity: 1 });
      await savedLaterApi.remove(productId);
      await refresh();
      await fetchSaved();
      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Moved to cart");
    } catch (err) {
      console.error(err);
      toastError("Failed to move to cart");
    } finally {
      setSavingIds((s) => ({ ...s, [productId]: false }));
    }
  };

  const addWishlistItemToCart = async (productId: string) => {
    try {
      setSavingIds((s) => ({ ...s, [productId]: true }));
      await cartApi.add({ product_id: productId, quantity: 1 });
      await refresh();
      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Added to cart");
    } catch (err) {
      console.error(err);
      toastError("Failed to add to cart");
    } finally {
      setSavingIds((s) => ({ ...s, [productId]: false }));
    }
  };

  const removeSaved = async (productId: string) => {
    try {
      await savedLaterApi.remove(productId);
      await fetchSaved();
      toastSuccess("Removed from saved items");
    } catch (err) {
      console.error(err);
      toastError("Failed to remove saved item");
    }
  };

  const addToWishlist = async (productId: string) => {
    try {
      setSavingIds((s) => ({ ...s, [`wishlist-${productId}`]: true }));
      await wishlistApi.add(productId);
      await fetchWishlist();
      toastSuccess("Added to wishlist");
    } catch (err) {
      console.error(err);
      toastError("Failed to add to wishlist");
    } finally {
      setSavingIds((s) => ({ ...s, [`wishlist-${productId}`]: false }));
    }
  };

  const removeWishlist = async (productId: string) => {
    try {
      await wishlistApi.remove(productId);
      await fetchWishlist();
      toastSuccess("Removed from wishlist");
    } catch (err) {
      console.error(err);
      toastError("Failed to remove wishlist item");
    }
  };

  const activeList = listView === "saved" ? saved : wishlist;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading cart...
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Continue Shopping</span>
          </button>

          <h1 className="text-3xl mb-8">Shopping Cart</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="w-24 h-24 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-2xl mb-2">Your cart is empty</h2>
                  <p className="text-muted-foreground mb-6">
                    Add some products to get started.
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white px-8 py-3 rounded-xl"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <>
                  {items.map((item) => (
                    <div
                      key={item.item_id ?? item.product_id}
                      className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border"
                    >
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${item.product_id}`)}
                          className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800"
                          aria-label={`View ${item.name}`}
                        >
                          <ImageWithFallback
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </button>

                        <div className="flex-1">
                          <div className="flex justify-between gap-3 mb-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/product/${item.product_id}`)}
                              className="line-clamp-2 text-left hover:text-[#00B0FF]"
                            >
                              {item.name}
                            </button>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => saveForLater(item.product_id, item.item_id)}
                                disabled={!!savingIds[`saved-${item.product_id}`]}
                                className="p-2 text-muted-foreground hover:text-foreground"
                                title="Save for later"
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => addToWishlist(item.product_id)}
                                disabled={!!savingIds[`wishlist-${item.product_id}`]}
                                className="p-2 text-muted-foreground hover:text-red-500"
                                title="Add to wishlist"
                              >
                                <Heart className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => item.item_id && removeItem(item.item_id)}
                                className="p-2 text-destructive"
                                title="Remove"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <p className="text-lg text-[#0D47A1] dark:text-[#00B0FF] mb-4">
                            Rs. {item.price.toFixed(2)}
                          </p>

                          {(item.size || item.color) && (
                            <div className="text-sm text-muted-foreground mb-4 flex gap-4">
                              {item.size && <span>Size: {item.size}</span>}
                              {item.color && <span>Color: {item.color}</span>}
                            </div>
                          )}

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.item_id ?? item.product_id,
                                  item.quantity - 1
                                )
                              }
                              className="w-8 h-8 rounded-lg border"
                            >
                              <Minus className="w-4 h-4 mx-auto" />
                            </button>

                            <span className="w-8 text-center">{item.quantity}</span>

                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.item_id ?? item.product_id,
                                  item.quantity + 1
                                )
                              }
                              className="w-8 h-8 rounded-lg border"
                            >
                              <Plus className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <div className="mt-8">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h3 className="text-xl">
                    {listView === "saved" ? "Saved for later" : "Wishlist"}
                  </h3>
                  <div className="inline-flex rounded-lg border border-border p-1 bg-white dark:bg-[#1a1a1a]">
                    <button
                      type="button"
                      onClick={() => setListView("saved")}
                      className={`px-4 py-2 rounded-md text-sm ${
                        listView === "saved"
                          ? "bg-[#00B0FF] text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Saved for later ({saved.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setListView("wishlist")}
                      className={`px-4 py-2 rounded-md text-sm ${
                        listView === "wishlist"
                          ? "bg-[#00B0FF] text-white"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Wishlist ({wishlist.length})
                    </button>
                  </div>
                </div>

                {activeList.length === 0 ? (
                  <div className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
                    {listView === "saved"
                      ? "No products saved for later."
                      : "No products in your wishlist."}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeList.map((product) => (
                      <div
                        key={product.product_id}
                        className="bg-white dark:bg-[#1a1a1a] rounded-xl p-4 border border-border flex items-center gap-4"
                      >
                        <button
                          type="button"
                          onClick={() => navigate(`/product/${product.product_id}`)}
                          className="flex-none w-14 h-14 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800"
                          aria-label={`View ${product.name}`}
                        >
                          <ImageWithFallback
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </button>

                        <div className="flex-1">
                          <div className="flex flex-wrap justify-between items-center gap-3">
                            <div>
                              <button
                                type="button"
                                onClick={() => navigate(`/product/${product.product_id}`)}
                                className="font-medium text-left hover:text-[#00B0FF]"
                              >
                                {product.name}
                              </button>
                              <div className="text-sm text-muted-foreground">
                                Rs. {product.price.toFixed(2)}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() =>
                                  listView === "saved"
                                    ? moveSavedToCart(product.product_id)
                                    : addWishlistItemToCart(product.product_id)
                                }
                                disabled={!!savingIds[product.product_id]}
                                className="px-3 py-2 bg-primary text-white rounded-md"
                              >
                                Move to cart
                              </button>
                              <button
                                onClick={() =>
                                  listView === "saved"
                                    ? removeSaved(product.product_id)
                                    : removeWishlist(product.product_id)
                                }
                                className="px-3 py-2 border rounded-md"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div>
              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border sticky top-24">
                <h3 className="text-xl mb-6">Order Summary</h3>

                <div className="flex justify-between text-xl mb-6">
                  <span>Total</span>
                  <span className="text-[#0D47A1] dark:text-[#00B0FF]">
                    Rs. {totalAmount.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={() => navigate("/checkout")}
                  disabled={items.length === 0}
                  className="w-full bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white py-4 rounded-xl disabled:opacity-50"
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CartPage;
