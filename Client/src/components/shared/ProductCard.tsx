import React from "react";
import { ShoppingCart, Heart, Star } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import { wishlistApi } from "../../config/api";

export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category?: string;
  categoryIds?: string[];
  trending?: boolean;
  rating?: number;
  description?: string;
  images?: string[];
  // optional fields for size-based or product-level discounts
  base_price?: number;
  discount_percent?: number;
  final_price?: number;
}

interface ProductCardProps {
  product: Product;
  onAddToCart?: (product: Product) => void;
  onClick?: (product: Product) => void;
  size?: "sm" | "md" | "lg";
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onAddToCart,
  onClick,
  size = "md",
}) => {
  const isSmall = size === "sm";
  const [liked, setLiked] = React.useState(false);
  const [savingWishlist, setSavingWishlist] = React.useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "customer") return;

    let mounted = true;
    wishlistApi
      .check(product.id)
      .then((res: any) => {
        if (!mounted) return;
        setLiked(Boolean(res?.inWishlist ?? res?.exists));
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [product.id]);

  const toggleWishlist = async () => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (!token || role !== "customer" || savingWishlist) return;

    try {
      setSavingWishlist(true);
      if (liked) {
        await wishlistApi.remove(product.id);
        setLiked(false);
      } else {
        await wishlistApi.add(product.id);
        setLiked(true);
      }
    } catch (err) {
      console.error("Wishlist update failed", err);
    } finally {
      setSavingWishlist(false);
    }
  };

  const role = typeof window !== 'undefined' ? localStorage.getItem('role') : null;
  const isSeller = role === 'seller';

  // Pricing helpers: compute base, final and saved amount consistently
  const basePrice = Number(product.base_price ?? product.price ?? 0);
  const discountPercent = Number(product.discount_percent ?? 0);
  const finalPriceComputed = product.final_price !== undefined && product.final_price !== null
    ? Number(product.final_price)
    : discountPercent > 0
      ? Number((basePrice * (1 - discountPercent / 100)).toFixed(2))
      : Number(product.price ?? 0);
  // Determine original price to compare against (prefer base_price if present, otherwise product.price)
  const originalPrice = Number(product.base_price ?? product.price ?? basePrice);
  const savedAmount = Math.max(0, originalPrice - finalPriceComputed);
  const showDiscount = savedAmount > 0;

  return (
    <div
      onClick={() => onClick?.(product)}
      className={`group relative bg-white dark:bg-[#1a1a1a] rounded-xl overflow-hidden border border-border hover:border-[#00B0FF] transition-all duration-300 hover:shadow-xl hover:shadow-[#00B0FF]/10 cursor-pointer ${
        isSmall ? "text-sm" : ""
      } h-full flex flex-col`}
    >
      {/* Trending badge */}
      {product.trending && (
        <div className="absolute left-3 top-3 z-10 bg-[#00B0FF] text-white text-xs px-2 py-1 rounded-full">
          Trending
        </div>
      )}

  {/* Image (fixed height for consistency) */}
  <div className={`w-full bg-gray-100 dark:bg-gray-800 overflow-hidden ${isSmall ? 'h-44' : 'h-56'}`}>
        <ImageWithFallback
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
      </div>
      {/* Info (fixed layout) */}
      <div className={`p-3 flex-1 flex flex-col justify-between`}> 
        <h3 className={`mb-1 line-clamp-2 ${isSmall ? 'text-sm' : ''}`}>
          {product.name}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span>{(product.rating ?? 0).toFixed(1)}</span>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3">
          <div className={`${isSmall ? 'flex flex-col items-start gap-1' : 'flex items-baseline gap-3'}`}>
            {showDiscount ? (
              <>
                {/* On small cards stack the struck price above the final price to avoid overlap */}
                {isSmall ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">{"\u20B9"}{originalPrice.toFixed(2)}</span>
                    <span className={`text-base sm:text-lg font-medium leading-none ${isSmall ? 'text-[#0D47A1]' : 'text-[#0D47A1] dark:text-[#00B0FF]'}`}>
                      {"\u20B9"}{finalPriceComputed.toFixed(2)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`text-base sm:text-lg font-medium leading-none ${'text-[#0D47A1] dark:text-[#00B0FF]'}`}>
                      {"\u20B9"}{finalPriceComputed.toFixed(2)}
                    </span>
                    <span className="text-sm text-muted-foreground line-through">{"\u20B9"}{originalPrice.toFixed(2)}</span>
                  </>
                )}
              </>
            ) : (
              <span className={`text-base sm:text-lg font-medium leading-none ${isSmall ? 'text-[#0D47A1]' : 'text-[#0D47A1] dark:text-[#00B0FF]'}`}>
                {"\u20B9"}{(product.price ?? 0).toFixed(2)}
              </span>
            )}
          </div>

          {/* Discount percent badge (top-right) - show if percent > 0 or computed percent > 0 */}
          {(() => {
            const base = Number(product.base_price ?? product.price ?? 0);
            const final = Number(product.final_price ?? finalPriceComputed ?? product.price ?? 0);
            const computedPercent = base && base > final ? Math.round(((base - final) / base) * 100) : 0;
            const percent = (Number(product.discount_percent ?? 0) > 0) ? Number(product.discount_percent) : computedPercent;
            return percent > 0 ? (
              <div className="absolute right-3 top-3 z-10 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {`${percent}% OFF`}
              </div>
            ) : null;
          })()}

          <div className="flex items-center gap-2 sm:gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist();
              }}
              disabled={savingWishlist}
              aria-label={liked ? "Remove from wishlist" : "Add to wishlist"}
              className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full bg-white text-gray-700 border border-gray-200 shadow-sm flex items-center justify-center transition-colors hover:text-red-500 disabled:opacity-60 dark:bg-[#111] dark:text-gray-200 dark:border-white/20"
            >
              <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            </button>

            {onAddToCart && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isSeller) return; // sellers cannot add to cart
                  onAddToCart(product);
                }}
                aria-label="Add to cart"
                disabled={isSeller}
                className={`w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-full ${isSeller ? 'bg-secondary text-muted-foreground cursor-not-allowed' : 'bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white'} flex items-center justify-center shadow-lg transition-transform hover:scale-105`}
              >
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
