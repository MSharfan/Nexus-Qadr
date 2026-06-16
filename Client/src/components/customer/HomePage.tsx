import React from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { CategorySection } from "../shared/CategorySection";
import { ProductCard, Product } from "../shared/ProductCard";

import { productApi, categoryApi, cartApi, bannerApi } from "../../config/api";
import { toastError, toastSuccess } from "../../utils/toast";

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = React.useState<Product[]>([]);
  const [categories, setCategories] = React.useState<
    Array<{ id: string; name: string }>
  >([]);
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [carouselIndex, setCarouselIndex] = React.useState(0);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<any | null>(null);

  /* ===========================
     LOAD DATA
  =========================== */
  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productRows, categoryRows, bannerObj] = await Promise.all([
          productApi.getAll(),
          categoryApi.getAll(),
          // banner is optional
          bannerApi.get(),
        ]);

        // 🔒 SAFE PRODUCT MAPPING (ALIGN WITH SERVER)
        const mappedProducts: Product[] = productRows.map((p: any) => ({
          id: String(p?.id),
          name:
            typeof p?.title === "string"
              ? p.title
              : typeof p?.name === "string"
                ? p.name
                : "Unnamed product",
          price: Number(p?.price ?? 0),
          image:
            typeof p?.image_url === "string"
              ? p.image_url
              : typeof p?.image === "string"
                ? p.image
                : "",
          // Use first category for compatibility
          category: String(
            Array.isArray(p?.category_ids) && p.category_ids.length > 0
              ? p.category_ids[0]
              : (p?.category_id ?? p?.category ?? p?.category_name ?? "other"),
          ),
          trending: Boolean(
            p?.is_trending ??
            p?.trending ??
            p?.featured ??
            p?.is_featured ??
            false,
          ),
          rating: Number(
            p?.rating ??
            p?.average_rating ??
            p?.avg_rating ??
            p?.review_rating ??
            0,
          ),
          // Discount/offer fields (if provided by the API).
          // Be defensive: map common alternative field names returned by different backends.
          // base_price: map common original/MRP-like fields, but do NOT default to p.price here
          base_price: (
            p?.base_price ?? p?.mrp ?? p?.original_price ?? p?.list_price ?? p?.price_before_discount
          ) === undefined
            ? undefined
            : Number(p?.base_price ?? p?.mrp ?? p?.original_price ?? p?.list_price ?? p?.price_before_discount),
          // final_price: map common discounted-price fields if provided; do NOT default to p.price here
          final_price: (
            p?.final_price ?? p?.price_after_discount ?? p?.discounted_price
          ) === undefined
            ? undefined
            : Number(p?.final_price ?? p?.price_after_discount ?? p?.discounted_price),
          discount_percent: Number(p?.discount_percent ?? p?.discount ?? 0),
          categoryIds: Array.isArray(p?.category_ids)
            ? p.category_ids.map(String)
            : undefined,
        }));

        // 🔒 SAFE CATEGORY MAPPING
        const mappedCategories: Array<{ id: string; name: string }> =
          categoryRows
            .map((c: any) => {
              if (typeof c === "string") {
                return { id: c, name: c };
              }
              if (typeof c?.name === "string") {
                return { id: String(c.id ?? c.slug ?? c.name), name: c.name };
              }
              return null;
            })
            .filter(Boolean) as Array<{ id: string; name: string }>;

        setProducts(mappedProducts);
        setCategories(mappedCategories);
        setBanner(bannerObj ?? null);
      } catch (err) {
        console.error(err);
        setError("Failed to load products");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  /* ===========================
     FEATURED / TRENDING (UI-ONLY)
     Respect current category filter so Trending updates with user's filter
  =========================== */
  const featuredProducts = React.useMemo(() => {
    const list = products.filter((p) => p.trending);
    if (selectedCategory === "all") return list.slice(0, 8);

    const filtered = list.filter((p) => {
      if (Array.isArray(p.category))
        return p.category.includes(selectedCategory);
      return String(p.category) === String(selectedCategory);
    });

    return filtered.slice(0, 8);
  }, [products, selectedCategory]);

  const carouselItems = React.useMemo(() => {
    const items = products
      .filter((p) => Boolean(p.image))
      .map((p) => ({ id: p.id, name: p.name, image: p.image }))
      .slice(0, 5);
    return items.length >= 3 ? items : [];
  }, [products]);

  // ref for trending scroller (mobile) so we can position it at the right edge
  const trendingRef = React.useRef<HTMLDivElement | null>(null);

  // ensure the RTL scroller starts at the rightmost edge so the first item is visible
  React.useEffect(() => {
    const el = trendingRef.current;
    if (!el) return;
    // run after layout; set scroll position to far right
    // delay slightly to ensure children measured correctly
    const t = setTimeout(() => {
      try {
        el.scrollLeft = el.scrollWidth;
      } catch (e) {
        // ignore
      }
    }, 50);
    return () => clearTimeout(t);
  }, [featuredProducts.length]);

  /* ===========================
     FILTERING (SAFE DEFAULT)
  =========================== */
  const filteredProducts = React.useMemo(() => {
    if (selectedCategory === "all") return products;
    return products.filter((p: any) =>
      Array.isArray(p.categoryIds)
        ? p.categoryIds.includes(selectedCategory)
        : p.category === selectedCategory,
    );
  }, [products, selectedCategory]);

  React.useEffect(() => {
    if (carouselItems.length === 0) return;
    const t = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % carouselItems.length);
    }, 3500);
    return () => clearInterval(t);
  }, [carouselItems.length]);

  const handleAddToCart = React.useCallback(async (product: Product) => {
    try {
      await cartApi.add({ product_id: product.id, quantity: 1 });
      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Added to cart");
    } catch (err) {
      console.error("Failed to add to cart", err);
      toastError("Failed to add to cart");
    }
  }, []);

  // restore scroll position when returning from product details
  React.useEffect(() => {
    if (loading) return;
    try {
      const pos = sessionStorage.getItem("products_scroll");
      if (pos) {
        window.scrollTo({ top: Number(pos), left: 0 });
        sessionStorage.removeItem("products_scroll");
      }
    } catch (e) {
      // ignore
    }
  }, [loading]);

  /* ===========================
     STATES
  =========================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading products…
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

  /* ===========================
     UI
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <CategorySection
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          {/* HERO */}
          <div
            className={`rounded-2xl p-8 md:p-12 mb-10 text-white ${banner?.gradientFrom && banner?.gradientTo ? "" : "bg-gradient-to-r from-[#0D47A1] to-[#00B0FF]"}`}
            style={
              banner
                ? {
                    background: `linear-gradient(90deg, ${banner.gradientFrom || "#0D47A1"}, ${banner.gradientTo || "#00B0FF"})`,
                  }
                : undefined
            }
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl md:text-4xl mb-4">
                  {banner?.title ?? "Welcome to Nexus Qadr"}
                </h2>
                <p className="text-lg text-white/90">
                  {banner?.subtitle ??
                    "Discover products directly from verified sellers"}
                </p>
              </div>
              {banner?.image_url && (
                <img
                  src={banner.image_url}
                  alt={banner.title ?? "banner"}
                  className="hidden md:block w-48 h-32 object-cover rounded-lg ml-6"
                />
              )}
            </div>
          </div>

          {/* TRENDING PRODUCTS (small cards) - compact horizontal "stories" strip */}
          {featuredProducts.length > 0 && (
            <div>
              <h2 className="text-2xl mb-4 mt-6 flex items-center gap-2">
                Trending Products<span aria-hidden="true">🔥</span>
              </h2>
            <div
              ref={trendingRef}
              className="w-full overflow-x-auto no-scrollbar mb-6"
              aria-hidden={false}
            >
              <div className="flex items-center gap-4 px-2 py-2">
                {featuredProducts.map((product) => {
                  const maxLabel = 14;
                  const displayName =
                    typeof product.name === "string" && product.name.length > maxLabel
                      ? `${product.name.slice(0, maxLabel)}…`
                      : product.name;

                  return (
                    <button
                      key={product.id}
                      onClick={() => navigate(`/product/${product.id}`)}
                      title={product.name}
                      className="flex-shrink-0 w-20 flex flex-col items-center focus:outline-none"
                    >
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 dark:border-neutral-700 shadow-sm">
                        {product.image ? (
                          <img
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center text-xs text-gray-500">
                            N/A
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-xs text-center truncate w-full">
                        {displayName}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          {/* ALL PRODUCTS */}
          <section>
            <h2 className="text-2xl mb-6">
              {selectedCategory === "all"
                ? "All Products"
                : (categories.find((c) => c.id === selectedCategory)?.name ??
                  "All Products")}
            </h2>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No products found
              </div>
            ) : (
              <div className="grid items-stretch grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    size="sm"
                    onClick={() => {
                      try { sessionStorage.setItem("products_scroll", String(window.scrollY ?? window.pageYOffset ?? 0)); } catch {}
                      navigate(`/product/${product.id}`);
                    }}
                    onAddToCart={handleAddToCart}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
