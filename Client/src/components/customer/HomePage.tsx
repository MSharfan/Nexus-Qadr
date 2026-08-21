import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { CategorySection } from "../shared/CategorySection";
import { ProductCard, Product } from "../shared/ProductCard";
import HomepageBanner from "../shared/HomepageBanner";

import { productApi, categoryApi, cartApi, bannerApi } from "../../config/api";
import { toastError, toastSuccess } from "../../utils/toast";

const skeletonTone = "home-skeleton";

const HeaderSkeleton: React.FC = () => (
  <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-border shadow-sm">
    <div className="container mx-auto px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className={`${skeletonTone} h-6 w-32 rounded`} />
        <div className="hidden md:block flex-1 max-w-2xl">
          <div className={`${skeletonTone} h-12 w-full rounded-xl`} />
        </div>
        <div className="flex items-center gap-3">
          <div className={`${skeletonTone} h-10 w-10 rounded-full`} />
          <div className={`${skeletonTone} h-10 w-10 rounded-full`} />
        </div>
      </div>
      <div className="md:hidden mt-4">
        <div className={`${skeletonTone} h-12 w-full rounded-xl`} />
      </div>
    </div>
  </header>
);

const CategorySkeleton: React.FC = () => (
  <div className="py-6 border-b border-border bg-white dark:bg-[#0A0A0A]">
    <div className="container mx-auto px-4">
      <div className="flex items-center gap-3 overflow-hidden pb-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className={`${skeletonTone} h-11 flex-shrink-0 rounded-xl ${
              index === 0 ? "w-16" : index % 2 === 0 ? "w-36" : "w-28"
            }`}
          />
        ))}
      </div>
    </div>
  </div>
);

const BannerSkeleton: React.FC = () => (
  <div className="mb-10 rounded-2xl border border-border bg-white p-8 dark:bg-[#1a1a1a] md:p-12">
    <div className="flex min-h-40 items-center justify-between gap-8">
      <div className="flex-1 space-y-5">
        <div className={`${skeletonTone} h-10 w-full max-w-md rounded`} />
        <div className={`${skeletonTone} h-5 w-full max-w-xl rounded`} />
      </div>
      <div className={`${skeletonTone} hidden h-32 w-48 rounded-lg md:block`} />
    </div>
  </div>
);

const TrendingSkeleton: React.FC = () => (
  <div className="home-trending-skeleton" aria-label="Loading trending products">
    <div className="home-skeleton home-trending-skeleton-title" />
    <div className="home-trending-skeleton-row">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="home-trending-skeleton-item">
          <div className="home-skeleton home-trending-skeleton-avatar" />
          <div className="home-skeleton home-trending-skeleton-label" />
        </div>
      ))}
    </div>
  </div>
);

const ProductGridSkeleton: React.FC = () => (
  <div
    className="grid items-stretch grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
    aria-label="Loading products"
  >
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={index}
        className="h-full overflow-hidden rounded-xl border border-border bg-white dark:bg-[#1a1a1a]"
      >
        <div className={`${skeletonTone} product-card-image-md w-full rounded-none`} />
        <div className="space-y-3 p-3">
          <div className={`${skeletonTone} h-4 w-4/5 rounded`} />
          <div className={`${skeletonTone} h-4 w-3/5 rounded`} />
          <div className="flex items-center gap-2">
            <div className={`${skeletonTone} h-4 w-4 rounded-full`} />
            <div className={`${skeletonTone} h-3 w-10 rounded`} />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className={`${skeletonTone} h-5 w-20 rounded`} />
            <div className="flex items-center gap-2">
              <div className={`${skeletonTone} h-8 w-8 rounded-full sm:h-10 sm:w-10`} />
              <div className={`${skeletonTone} h-8 w-8 rounded-full sm:h-10 sm:w-10`} />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);
const HOME_PAGE_CACHE_KEY = "nexus_qadr_home_cache_v1";

type HomePageCache = {
  products: Product[];
  categories: Array<{ id: string; name: string }>;
  banner: any | null;
};

const readHomePageCache = (): HomePageCache | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(HOME_PAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HomePageCache;
    return parsed && Array.isArray(parsed.products) ? parsed : null;
  } catch {
    return null;
  }
};

const writeHomePageCache = (data: HomePageCache) => {
  if (typeof window === "undefined") return;

  try {
    sessionStorage.setItem(HOME_PAGE_CACHE_KEY, JSON.stringify(data));
  } catch {
    // ignore cache write failures
  }
};

const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const [products, setProducts] = React.useState<Product[]>(() => readHomePageCache()?.products ?? []);
  const [categories, setCategories] = React.useState<
    Array<{ id: string; name: string }>
  >(() => readHomePageCache()?.categories ?? []);
  const [selectedCategory, setSelectedCategory] = React.useState("all");
  const [carouselIndex, setCarouselIndex] = React.useState(0);

  const [loading, setLoading] = React.useState(() => !readHomePageCache());
  const [error, setError] = React.useState<string | null>(null);
  const [banner, setBanner] = React.useState<any | null>(() => readHomePageCache()?.banner ?? null);

  /* ===========================
     LOAD DATA
  =========================== */
  React.useEffect(() => {
    let cancelled = false;

    const cached = readHomePageCache();
    if (cached) {
      setProducts(cached.products);
      setCategories(cached.categories);
      setBanner(cached.banner ?? null);
      setLoading(false);
      setError(null);
      return () => {
        cancelled = true;
      };
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        const [productRows, categoryRows] = await Promise.all([
          productApi.getAll(),
          categoryApi.getAll(),
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

        if (cancelled) return;

        const nextCache: HomePageCache = {
          products: mappedProducts,
          categories: mappedCategories,
          banner: null,
        };

        writeHomePageCache(nextCache);
        setProducts(mappedProducts);
        setCategories(mappedCategories);
      } catch (err) {
        console.error(err);
        setError("Failed to load products");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    void bannerApi
      .get()
      .then((bannerObj) => {
        if (!cancelled) {
          setBanner(bannerObj ?? null);
          const current = readHomePageCache();
          if (current) {
            writeHomePageCache({ ...current, banner: bannerObj ?? null });
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load banner", err);
        if (!cancelled) setBanner(null);
      });

    return () => {
      cancelled = true;
    };
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
     UI
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      {loading ? <HeaderSkeleton /> : <Header />}

      {loading ? (
        <CategorySkeleton />
      ) : (
        <CategorySection
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          categories={categories}
        />
      )}
      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          {/* HERO */}
          {loading ? (
            <BannerSkeleton />
          ) : (
            banner &&
            (banner.show_banner ?? banner.is_enabled ?? banner.enabled ?? true) !== false &&
            selectedCategory === "all" && (
              <HomepageBanner banner={banner} className="nq-storefront-banner" />
            )
          )}

          {/* TRENDING PRODUCTS (small cards) - compact horizontal "stories" strip */}
          {loading ? (
            <TrendingSkeleton />
          ) : (
            featuredProducts.length > 0 && (
              <div>
                <h2 className="text-2xl mb-4 mt-6 flex items-center gap-2">
                  Trending Products<span aria-hidden="true">{"\uD83D\uDD25"}</span>
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
                          ? `${product.name.slice(0, maxLabel)}...`
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
            )
          )}

          {/* ALL PRODUCTS */}
          <section>
            <h2 className="text-2xl mb-6">
              {selectedCategory === "all"
                ? "All Products"
                : (categories.find((c) => c.id === selectedCategory)?.name ??
                  "All Products")}
            </h2>

            {loading ? (
              <ProductGridSkeleton />
            ) : error ? (
              <div className="text-center py-12 text-red-500">{error}</div>
            ) : filteredProducts.length === 0 ? (
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
