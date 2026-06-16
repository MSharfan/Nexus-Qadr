import React from "react";
import { useNavigate } from "react-router-dom";
import { MyProductsPage } from "./MyProductsPage";
import { request } from "../../config/api";
import { toast } from "sonner";
import { createPortal } from "react-dom";

const SellerProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await request<any[]>('/product/seller');
        setProducts(
          Array.isArray(data)
            ? data.map((p) => ({
                id: p.id,
                name: p.title ?? p.name,
                price: Number(p.price ?? 0),
                stock: Number(p.stock ?? 0),
                category: p.category_name ?? String(p.category_id ?? ''),
                image: p.image_url ?? p.image,
                status: p.status ?? 'inactive',
              }))
            : []
        );
      } catch (err) {
        console.error('Failed to load seller products', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleAdd = () => navigate('/seller/products/add');
  const handleEdit = (id: string) => navigate(`/seller/products/edit/${id}`);
  const handleDelete = async (id: string) => {
    toast.custom(
      (t) =>
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative w-full max-w-md rounded-xl border border-border bg-white dark:bg-[#1a1a1a] p-6 shadow-xl">
              <div className="text-lg font-semibold mb-2">Delete product?</div>
              <div className="text-sm text-muted-foreground mb-4">
                This will permanently remove the product.
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => toast.dismiss(t)}
                  className="px-4 py-2 rounded-lg border border-border bg-secondary hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await request(`/product/${id}`, { method: "DELETE" });
                      setProducts((prev) => prev.filter((p) => p.id !== id));
                      toast.success("Product deleted");
                    } catch (err) {
                      console.error("Delete failed", err);
                      toast.error("Delete failed");
                    } finally {
                      toast.dismiss(t);
                    }
                  }}
                  className="px-4 py-2 rounded-lg border border-border bg-red-600 text-black hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>,
          document.body
        ),
      { duration: Infinity }
    );
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="container mx-auto px-4 py-8">
      <MyProductsPage
        products={products}
        onAddProduct={handleAdd}
        onEditProduct={handleEdit}
        onDeleteProduct={handleDelete}
      />
    </div>
  );
};

export default SellerProductsPage;
