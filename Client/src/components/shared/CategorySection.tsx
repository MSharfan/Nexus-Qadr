import React from "react";
import {
  Shirt,
  Users,
  Baby,
  Smartphone,
  Tv,
  Watch,
  Tag,
} from "lucide-react";
import { categoryApi } from "../../config/api";

interface Category {
  id: string;
  name: string;
}

/* ---------------- SAFE ICON MAP ---------------- */
/* Backend controls category IDs, frontend maps icons defensively */
const iconMap: Record<string, React.ElementType> = {
  men: Shirt,
  women: Users,
  kids: Baby,
  gadgets: Smartphone,
  appliances: Tv,
  accessories: Watch,
};

interface CategorySectionProps {
  selectedCategory?: string;
  onSelectCategory?: (categoryId: string) => void;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  selectedCategory = "all",
  onSelectCategory,
}) => {
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);

  /* ---------------- LOAD CATEGORIES ---------------- */
  React.useEffect(() => {
    const load = async () => {
      try {
        const rows: any[] = await categoryApi.getAll();

        const mapped: Category[] = rows.map((c) => ({
          id: String(c.id ?? c.slug ?? c.name),
          name:
            typeof c.name === "string"
              ? c.name
              : "Category",
        }));

        setCategories(mapped);
      } catch (err) {
        console.error("Failed to load categories", err);
        setCategories([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="py-6 border-b border-border bg-white dark:bg-[#0A0A0A]">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {/* ALL */}
          <button
            onClick={() => onSelectCategory?.("all")}
            className={`px-6 py-2.5 rounded-xl whitespace-nowrap transition-all ${
              selectedCategory === "all"
                ? "bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white shadow-lg shadow-[#00B0FF]/30"
                : "bg-secondary text-foreground hover:bg-[#00B0FF]/10"
            }`}
          >
            All
          </button>

          {/* CATEGORIES */}
          {!loading &&
            categories.map((category) => {
              const Icon =
                iconMap[category.id.toLowerCase()] ?? Tag;

              return (
                <button
                  key={category.id}
                  onClick={() =>
                    onSelectCategory?.(category.id)
                  }
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                    selectedCategory === category.id
                      ? "bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white shadow-lg shadow-[#00B0FF]/30"
                      : "bg-secondary text-foreground hover:bg-[#00B0FF]/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{category.name}</span>
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
};
