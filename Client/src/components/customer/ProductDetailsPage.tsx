import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Star,
  ShoppingCart,
  Heart,
  Truck,
  Shield,
  RotateCcw,
  X,
} from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { Product } from "../shared/ProductCard";
import { ImageWithFallback } from "../shared/ImageWithFallback";
import { toastSuccess, toastError } from "../../utils/toast";

import { productApi, cartApi, wishlistApi } from "../../config/api";

const ProductDetailsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = React.useState<Product | null>(null);
  const [sizes, setSizes] = React.useState<string[]>([]);
  const [sizePrices, setSizePrices] = React.useState<Array<{
    size: string;
    base_price: number;
    price?: number;
    final_price: number;
    discount_percent: number;
  }>>([]);
  const [colors, setColors] = React.useState<string[]>([]);
  const [colorImageMap, setColorImageMap] = React.useState<Record<string, string[]>>({});
  const [availableSizesByColor, setAvailableSizesByColor] = React.useState<Record<string, Set<string>>>({});
  const [selectedSize, setSelectedSize] = React.useState<string>("");
  const [selectedColor, setSelectedColor] = React.useState<string>("");
  const [touchStartX, setTouchStartX] = React.useState<number | null>(null);
  const didSwipeRef = React.useRef(false);

  const toColorHex = React.useCallback((color: string) => {
    const key = color.trim().toLowerCase();
    const map: Record<string, string> = {
      "navy blue": "#1b2a4e",
      navy: "#1b2a4e",
      blue: "#1e90ff",
      skyblue: "#87ceeb",
      "sky blue": "#87ceeb",
      red: "#e53935",
      maroon: "#800000",
      green: "#43a047",
      olive: "#6b8e23",
      black: "#111111",
      white: "#f5f5f5",
      gray: "#9e9e9e",
      grey: "#9e9e9e",
      yellow: "#fdd835",
      orange: "#fb8c00",
      purple: "#8e24aa",
      pink: "#ec407a",
      brown: "#8d6e63",
      beige: "#f5f5dc",
      gold: "#d4af37",
      silver: "#c0c0c0",
    };
    return map[key] ?? key;
  }, []);

  const splitColors = (raw: string) =>
    raw
      .split("/")
      .map((s) => s.trim())
      .filter(Boolean);
  const [activeImage, setActiveImage] = React.useState<string>("");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewZoom, setPreviewZoom] = React.useState(1);
  const [previewOffset, setPreviewOffset] = React.useState({ x: 0, y: 0 });
  const [previewLastTap, setPreviewLastTap] = React.useState<number>(0);
  const previewDragRef = React.useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [quantity, setQuantity] = React.useState(1);
  const [isFavorite, setIsFavorite] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeRole, setActiveRole] = React.useState<string | null>(null);

  /* ===========================
     LOAD PRODUCT (HYBRID)
  =========================== */
  React.useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const p: any = await productApi.getById(id);

        // 🔒 SAFE MAPPING (NO ASSUMPTIONS)
        const extraImages = Array.isArray(p?.extra_images)
          ? p.extra_images.map((it: any) => it?.image_url).filter(Boolean)
          : [];

        const mapped: Product & { images?: string[] } = {
          id: String(p?.id),
          name: typeof p?.title === "string" ? p.title : (typeof p?.name === "string" ? p.name : "Unnamed product"),
          price: Number(p?.price ?? 0),
          image: typeof p?.image_url === "string" ? p.image_url : (typeof p?.image === "string" ? p.image : ""),
          base_price: p?.base_price ?? p?.price,
          final_price: p?.final_price ?? p?.price,
          discount_percent: Number(p?.discount_percent ?? 0),
          category: String(p?.category_id ?? p?.category ?? p?.category_name ?? "other"),
          description: typeof p?.description === "string" ? p.description : "",
          images: [typeof p?.image_url === "string" ? p.image_url : "", ...extraImages].filter(Boolean),
        } as Product;

        setProduct(mapped);
        const sizeList = Array.isArray(p?.sizes) ? p.sizes : [];
        const sizePriceList = Array.isArray(p?.size_prices)
          ? p.size_prices.map((row: any) => ({
              size: String(row.size),
              base_price: Number(row.base_price ?? row.price ?? p?.price ?? 0),
              price: row.price === null || row.price === undefined ? undefined : Number(row.price),
              final_price: Number(row.final_price ?? row.price ?? p?.price ?? 0),
              discount_percent: Number(row.discount_percent ?? p?.discount_percent ?? 0),
            }))
          : [];
        const colorList = Array.isArray(p?.colors) ? p.colors : [];
  setSizes(sizeList);
  setSizePrices(sizePriceList);
  setColors(colorList);
  // Build color->images map if the product API provides color-specific images
  const cmap: Record<string, string[]> = {};
  const norm = (c: string) => String(c || '').trim().toLowerCase();

  // 1) Check for structured color_images object { color: [urls] }
  if (p?.color_images && typeof p.color_images === 'object') {
    for (const [k, v] of Object.entries(p.color_images)) {
      if (Array.isArray(v)) cmap[norm(k)] = v.filter(Boolean).map(String);
    }
  }

  // 2) Check extra_images entries for color metadata
  if (Array.isArray(p?.extra_images)) {
    for (const it of p.extra_images) {
      if (!it) continue;
      const url = it.image_url || it.url || it.src || null;
      const colorKey = it.color || it.variant_color || it.meta?.color || null;
      if (url && colorKey) {
        const k = norm(colorKey);
        cmap[k] = cmap[k] || [];
        cmap[k].push(String(url));
      }
    }
  }

  // 3) Check p.images array for objects { url, color }
  if (Array.isArray(p?.images)) {
    for (const it of p.images) {
      if (!it) continue;
      if (typeof it === 'object' && (it.url || it.image || it.src)) {
        const url = it.url || it.image || it.src;
        const colorKey = it.color || it.variant_color || null;
        if (url && colorKey) {
          const k = norm(colorKey);
          cmap[k] = cmap[k] || [];
          cmap[k].push(String(url));
        }
      }
    }
  }

  setColorImageMap(cmap);

  // Build size availability if variants/skus are present
  const avail: Record<string, Set<string>> = {};
  if (Array.isArray(p?.variants)) {
    for (const v of p.variants) {
      const c = norm(v.color || v.variant_color || v.color_name || '');
      const s = v.size || v.size_name || v.option || null;
      const stock = v.stock ?? v.quantity ?? v.available ?? v.in_stock ?? null;
      if (!s || stock === null) continue;
      if (Number(stock) <= 0) continue;
      const k = c || 'default';
      avail[k] = avail[k] || new Set();
      avail[k].add(String(s));
    }
  }
  // Also check skus or size_price rows for color/stock
  if (Array.isArray(p?.skus)) {
    for (const sku of p.skus) {
      const c = norm(sku.color || sku.variant_color || '');
      const s = sku.size || sku.size_name || null;
      const stock = sku.stock ?? sku.quantity ?? null;
      if (!s || stock === null) continue;
      if (Number(stock) <= 0) continue;
      const k = c || 'default';
      avail[k] = avail[k] || new Set();
      avail[k].add(String(s));
    }
  }

  setAvailableSizesByColor(avail);
  // Do not auto-select a size or color — force the customer to choose
  setSelectedSize("");
  setSelectedColor("");
  setActiveImage(mapped.image || mapped.images?.[0] || "");
        setPreviewOpen(false);
        setPreviewZoom(1);
        setPreviewOffset({ x: 0, y: 0 });
      } catch (err) {
        console.error(err);
        setError("Product not found");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  // When selectedColor changes, switch gallery images if color-specific images exist
  React.useEffect(() => {
    if (!product) return;
    const norm = (c: string) => String(c || '').trim().toLowerCase();
    const imagesForColor = colorImageMap[norm(selectedColor)];
    if (selectedColor && Array.isArray(imagesForColor) && imagesForColor.length > 0) {
      // switch gallery to the first color image
      setActiveImage(imagesForColor[0]);
      // update product.images shown to this color's images when rendering
      // no mutation to product — rendering logic will pick from colorImageMap when selectedColor is set
      // if previously selected size is not available for this color, clear it
      const availSet = availableSizesByColor[norm(selectedColor)];
      if (selectedSize && availSet && !availSet.has(selectedSize)) {
        setSelectedSize("");
      }
    } else {
      // revert to default product images
      setActiveImage(product.image || product.images?.[0] || "");
    }
  }, [selectedColor, colorImageMap, product, availableSizesByColor]);

  React.useEffect(() => {
    const role = localStorage.getItem("role");
    setActiveRole(role);
  }, []);

  React.useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "customer") {
      setIsFavorite(false);
      return;
    }

    const check = async () => {
      try {
        const res = await wishlistApi.check(id);
        setIsFavorite(Boolean(res?.exists));
      } catch {
        setIsFavorite(false);
      }
    };

    check();
  }, [id]);

  React.useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPreviewOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  /* ===========================
     CART
  =========================== */
  const handleAddToCart = async () => {
    if (!product) return;

    try {
      if (sizes.length > 0 && !selectedSize) {
        toastError("Please select a size");
        return;
      }
      if (colors.length > 0 && !selectedColor) {
        toastError("Please select a color");
        return;
      }
      await cartApi.add({
        product_id: product.id,
        quantity,   
        size: selectedSize || undefined,
        color: selectedColor || undefined,
      });
      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Added to cart 🛒");
    } catch (err) {
      console.error(err);
      toastError("Failed to add to cart");
    }
  };

  const openImagePreview = () => {
    setPreviewZoom(1);
    setPreviewOffset({ x: 0, y: 0 });
    setPreviewOpen(true);
  };

  const togglePreviewZoom = () => {
    setPreviewZoom((z) => {
      const nextZoom = z === 1 ? 2 : 1;
      if (nextZoom === 1) {
        setPreviewOffset({ x: 0, y: 0 });
      }
      return nextZoom;
    });
  };

  const startPreviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (previewZoom === 1) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    previewDragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: previewOffset.x,
      offsetY: previewOffset.y,
    };
  };

  const movePreviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = previewDragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    setPreviewOffset({
      x: drag.offsetX + e.clientX - drag.startX,
      y: drag.offsetY + e.clientY - drag.startY,
    });
  };

  const endPreviewDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (previewDragRef.current?.pointerId === e.pointerId) {
      previewDragRef.current = null;
    }
  };

  const handlePreviewTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const now = Date.now();
    if (now - previewLastTap < 500) {
      e.preventDefault();
      togglePreviewZoom();
      setPreviewLastTap(0);
      return;
    }
    setPreviewLastTap(now);
  };


  /* ===========================
     STATES
  =========================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading product…
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        {error ?? "Product not found"}
      </div>
    );
  }

  const selectedSizePrice = sizePrices.find((row) => row.size === selectedSize);
  const productDiscount = Number((product as any).discount_percent ?? 0);
  const basePrice = selectedSizePrice?.base_price ?? product.price;
  const discountPercent = selectedSizePrice?.discount_percent || productDiscount;
  const finalPrice = selectedSizePrice?.final_price ?? Number((basePrice * (1 - discountPercent / 100)).toFixed(2));
  

  /* ===========================
     UI (DESIGN UNCHANGED)
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Products</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Image */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 border border-border">
              <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 mb-4">
                <div
                  className="w-full h-full cursor-zoom-in"
                  onClick={() => {
                    if (didSwipeRef.current) {
                      didSwipeRef.current = false;
                      return;
                    }
                    openImagePreview();
                  }}
                  onTouchStart={(e) => setTouchStartX(e.touches[0]?.clientX ?? null)}
                  onTouchEnd={(e) => {
                    const endX = e.changedTouches[0]?.clientX ?? null;
                    if (touchStartX === null || endX === null) return;
                    const delta = touchStartX - endX;
                    if (!product.images || product.images.length === 0) return;
                    if (Math.abs(delta) < 40) return;
                    didSwipeRef.current = true;
                    const currentIdx = product.images.indexOf(activeImage || product.image);
                    const nextIdx =
                      delta > 0
                        ? (currentIdx + 1) % product.images.length
                        : (currentIdx - 1 + product.images.length) % product.images.length;
                    setActiveImage(product.images[nextIdx]);
                  }}
                >
                  <ImageWithFallback
                    src={activeImage || product.image}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-200"
                  />
                </div>
              </div>
                  {( (selectedColor && colorImageMap[selectedColor?.trim().toLowerCase()] && colorImageMap[selectedColor?.trim().toLowerCase()].length > 1)
                    || (product.images && product.images.length > 1)
                  ) && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {((selectedColor && colorImageMap[selectedColor?.trim().toLowerCase()])
                    ? colorImageMap[selectedColor?.trim().toLowerCase()].slice(0,5)
                    : (product.images || [])
                  ).slice(0, 5).map((img, idx) => (
                    <button
                      key={`${img}-${idx}`}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`h-16 w-20 flex-shrink-0 rounded-lg overflow-hidden border ${
                        img === activeImage ? "border-[#00B0FF]" : "border-border"
                      }`}
                    >
                      <img
                        src={img}
                        alt={product?.name ? `${product.name} - image ${idx + 1}` : "Product image"}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div>
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-8 border border-border mb-6">
                <h1 className="text-3xl mb-4">{product.name}</h1>

                {/* Rating (UI ONLY) */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className="w-5 h-5 text-gray-300"
                      />
                    ))}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    (No reviews yet)
                  </span>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl text-[#0D47A1] dark:text-[#00B0FF]">
                      ₹{finalPrice.toFixed(2)}
                    </span>
                    {/* Discount badge from selected size or product (only if > 0) */}
                    {(() => {
                      const sizeRow = sizePrices.find((r) => r.size === selectedSize);
                      const base = sizeRow?.base_price ?? (product as any).base_price ?? (product as any).price;
                      const final = sizeRow?.final_price ?? (product as any).final_price ?? (product as any).price;
                      const saved = Math.max(0, Number(base) - Number(final));
                      return saved > 0 ? (
                        <span className="text-sm bg-red-500 text-white rounded-full px-3 py-1">
                          {`\u20B9${saved.toFixed(2)} OFF`}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {discountPercent > 0 && (
                    <div className="mt-2 flex items-center gap-3 text-sm">
                      <span className="text-muted-foreground line-through">
                        ₹{basePrice.toFixed(2)}
                      </span>
                      <span className="rounded-full bg-green-500/10 px-2 py-1 text-green-500">
                        {discountPercent}% off
                      </span>
                    </div>
                  )}
                </div>

                {/* Sizes / Colors */}
                {(sizes.length > 0 || colors.length > 0) && (
                  <div className="mb-6 space-y-4">
                    {sizes.length > 0 && (
                      <div>
                        <label className="block mb-2">Sizes</label>
                        <div className="flex flex-wrap gap-2">
                          {sizes.map((s) => {
                            const norm = (c: string) => String(c || '').trim().toLowerCase();
                            const availSet = selectedColor ? availableSizesByColor[norm(selectedColor)] : null;
                            const available = availSet ? availSet.has(s) : true;
                            return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => available && setSelectedSize(s)}
                              disabled={!available}
                              className={`px-3 py-1 rounded-full border text-sm ${
                                selectedSize === s
                                  ? "border-[#00B0FF] bg-[#00B0FF]/10 text-[#00B0FF]"
                                  : available
                                    ? "border-border bg-secondary"
                                    : "border-border bg-secondary text-muted-foreground line-through opacity-60 cursor-not-allowed"
                              }`}
                              role="radio"
                              aria-checked={selectedSize === s}
                            >
                              {s}
                            </button>
                            );
                          })}
                        </div>
                        {!selectedSize && (
                          <p className="text-sm text-red-500 mt-2">Please select a size</p>
                        )}
                      </div>
                    )}
                    {colors.length > 0 && (
                      <div>
                        <label className="block mb-2">Colors</label>
                        <div className="flex flex-wrap gap-2">
                          {colors.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setSelectedColor(c)}
                              className={`px-3 py-1 rounded-full border text-sm flex items-center gap-2 ${
                                selectedColor === c
                                  ? "border-[#00B0FF] bg-[#00B0FF]/10 text-[#00B0FF]"
                                  : "border-border bg-secondary"
                              }`}
                              role="radio"
                              aria-checked={selectedColor === c}
                            >
                              {splitColors(c).length > 1 ? (
                                <span className="w-4 h-4 rounded-full border overflow-hidden flex">
                                  {splitColors(c)
                                    .slice(0, 2)
                                    .map((part, i) => (
                                      <span
                                        key={`${part}-${i}`}
                                        className="flex-1"
                                        style={{ backgroundColor: toColorHex(part) }}
                                      />
                                    ))}
                                </span>
                              ) : (
                                <span
                                  className="w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: toColorHex(c) }}
                                />
                              )}
                              {c}
                            </button>
                          ))}
                        </div>
                        {!selectedColor && (
                          <p className="text-sm text-red-500 mt-2">Please select a color</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-6">
                  <label className="block mb-2">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setQuantity((q) => Math.max(1, q - 1))
                      }
                      className="w-10 h-10 rounded-lg border border-border"
                    >
                      -
                    </button>
                    <span className="w-12 text-center">{quantity}</span>
                    <button
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-10 h-10 rounded-lg border border-border"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mb-6">
                  <button
                    onClick={handleAddToCart}
                    disabled={activeRole !== "customer"}
                    className={`flex-1 border-2 py-4 rounded-xl flex items-center justify-center gap-2 ${
                      activeRole === "customer"
                        ? "bg-white dark:bg-[#0A0A0A] border-[#0D47A1] text-[#0D47A1] dark:text-[#00B0FF] dark:border-[#00B0FF]"
                        : "bg-secondary border-border text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {activeRole === "customer" ? "Add to Cart" : "Only customers can add to cart"}
                  </button>

                  <button
                    onClick={async () => {
                      if (!product) return;
                      try {
                        if (isFavorite) {
                          await wishlistApi.remove(product.id);
                          setIsFavorite(false);
                        } else {
                          await wishlistApi.add(product.id);
                          setIsFavorite(true);
                        }
                      } catch (err) {
                        console.error("Wishlist update failed", err);
                      }
                    }}
                    className="w-14 border-2 border-border rounded-xl flex items-center justify-center"
                  >
                    <Heart
                      className={`w-5 h-5 ${
                        isFavorite
                          ? "fill-red-500 text-red-500"
                          : "text-gray-600"
                      }`}
                    />
                  </button>
                </div>

                {/* Features */}
                <div className="grid grid-cols-3 gap-4">
                  <Feature icon={Truck} label="Free Delivery" />
                  <Feature icon={Shield} label="Secure Payment" />
                  <Feature icon={RotateCcw} label="Easy Returns" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {previewOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 p-4 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Product image preview"
          onClick={() => setPreviewOpen(false)}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPreviewOpen(false);
            }}
            className="absolute right-4 top-4 w-11 h-11 rounded-full bg-white/10 text-white border border-white/20 flex items-center justify-center hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="w-5 h-5" />
          </button>

          {previewZoom === 1 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-4 py-2 text-sm text-white border border-white/20 backdrop-blur">
              Double Tap to Zoom
            </div>
          )}

          <div
            className={`max-w-5xl max-h-[86vh] overflow-hidden rounded-xl touch-none ${
              previewZoom === 1 ? "cursor-zoom-in" : "cursor-grab active:cursor-grabbing"
            }`}
            onClick={(e) => e.stopPropagation()}
            onDoubleClick={togglePreviewZoom}
            onTouchEnd={handlePreviewTouchEnd}
            onPointerDown={startPreviewDrag}
            onPointerMove={movePreviewDrag}
            onPointerUp={endPreviewDrag}
            onPointerCancel={endPreviewDrag}
          >
            <ImageWithFallback
              src={activeImage || product.image}
              alt={product.name}
              className="max-w-full max-h-[86vh] object-contain transition-transform duration-200 select-none"
              style={{
                transform: `translate(${previewOffset.x}px, ${previewOffset.y}px) scale(${previewZoom})`,
              }}
              draggable={false}
            />
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

const Feature = ({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) => (
  <div className="text-center p-4 bg-secondary rounded-xl">
    <Icon className="w-6 h-6 text-[#00B0FF] mx-auto mb-2" />
    <p className="text-sm">{label}</p>
  </div>
);

export default ProductDetailsPage;
