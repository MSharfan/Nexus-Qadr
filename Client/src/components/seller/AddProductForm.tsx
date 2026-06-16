import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Save, Edit3 } from "lucide-react";
import TuiImageEditor from "tui-image-editor";
import "tui-image-editor/dist/tui-image-editor.css";
import "tui-color-picker/dist/tui-color-picker.css";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { request } from "../../config/api";
import { categoryApi } from "../../config/api";
import { useToast } from "../ui/ToastProvider";

const AddProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { id: productId } = useParams<{ id: string }>();
  const isEdit = Boolean(productId);

  const [formData, setFormData] = React.useState({
    name: "",
    description: "",
    price: "",
    discountPercent: "",
    category: "",
    categories: [] as string[],
    stock: "",
    sizes: "",
    sizePricing: "",
    colors: "",
    weightKg: "0.5",
    lengthCm: "10",
    widthCm: "10",
    heightCm: "5",
  });

  const [categories, setCategories] = React.useState<{ id: number; name: string }[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadingProduct, setLoadingProduct] = React.useState(false);
  const toast = useToast();
  // Keep object URLs so we can revoke them when files removed or component unmounts
  const [objectUrls, setObjectUrls] = React.useState<string[]>([]);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorIndex, setEditorIndex] = React.useState<number | null>(null);
  const [editorSrc, setEditorSrc] = React.useState<string>("");
  const editorRef = React.useRef<any>(null);
  const editorContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [existingImageUrl, setExistingImageUrl] = React.useState<string>("");
  const [existingExtraUrls, setExistingExtraUrls] = React.useState<string[]>([]);

  const parseSizePricing = (value: string) =>
    value
      .split(",")
      .map((part) => {
        const [size, price, discount] = part.split(":").map((x) => x.trim());
        return {
          size,
          price: Number(price),
          discount_percent: Number(discount || 0),
        };
      })
      .filter((row) => row.size && Number.isFinite(row.price) && row.price > 0);

  const formatSizePricing = (rows: any[]) =>
    rows
      .map((row) => {
        const size = row?.size ?? "";
        const price = row?.price ?? row?.base_price ?? "";
        const discount = row?.discount_percent ?? "";
        return discount ? `${size}:${price}:${discount}` : `${size}:${price}`;
      })
      .filter(Boolean)
      .join(", ");

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);

    // append new files to existing list, avoid exact duplicates (by name+size)
    setFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const merged = [...prev];
      for (const f of selected) {
        const key = `${f.name}_${f.size}`;
        if (!existingKeys.has(key)) {
          merged.push(f);
          existingKeys.add(key);
        }
        // stop if we already reached 8 images
        if (merged.length >= 8) break;
      }
      return merged.slice(0, 8);
    });

    // reset the input so selecting the same file(s) again will fire change
    e.currentTarget.value = "";
  };

  const removeFileAt = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const moveFile = (from: number, to: number) => {
    if (from === to) return;
    setFiles((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  // keep object urls in sync with files
  React.useEffect(() => {
    setObjectUrls((prev) => {
      const next: string[] = [];
      for (let i = 0; i < files.length; i++) {
        next[i] = prev[i] ?? URL.createObjectURL(files[i]);
      }
      // revoke urls that no longer have a file
      for (let i = files.length; i < prev.length; i++) {
        try { URL.revokeObjectURL(prev[i]); } catch {}
      }
      return next;
    });
  }, [files]);

  // revoke urls on unmount
  React.useEffect(() => {
    return () => {
      objectUrls.forEach((u) => {
        try { URL.revokeObjectURL(u); } catch {}
      });
    };
  }, [objectUrls]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const data = await categoryApi.getAll();
        // Attempt to map to {id, name}
        const mapped = (Array.isArray(data) ? data : []).map((c: any) => ({
          id: c.id,
          name: c.name ?? c.title ?? String(c.id),
        }));
        setCategories(mapped);
      } catch (err) {
        console.error("Failed to load categories", err);
      }
    };

    load();
  }, []);

  React.useEffect(() => {
    if (!isEdit || !productId) return;
    const loadProduct = async () => {
      try {
        setLoadingProduct(true);
        const data = await request<any>(`/product/${productId}`);
        setFormData({
          name: data.title ?? data.name ?? "",
          description: data.description ?? "",
          price: String(data.price ?? ""),
          discountPercent: String(data.discount_percent ?? ""),
          category: String(data.category_id ?? ""),
          categories: Array.isArray(data.category_ids)
            ? data.category_ids.map((c: any) => String(c))
            : data.category_id
              ? [String(data.category_id)]
              : [],
          stock: String(data.stock ?? ""),
          sizes: Array.isArray(data.sizes) ? data.sizes.join(", ") : "",
          sizePricing: Array.isArray(data.size_prices) ? formatSizePricing(data.size_prices) : "",
          colors: Array.isArray(data.colors) ? data.colors.join(", ") : "",
          weightKg: String(data.weight_kg ?? "0.5"),
          lengthCm: String(data.length_cm ?? "10"),
          widthCm: String(data.width_cm ?? "10"),
          heightCm: String(data.height_cm ?? "5"),
        });
        setExistingImageUrl(data.image_url ?? "");
        const extraUrls = Array.isArray(data.extra_images)
          ? data.extra_images.map((it: any) => it?.image_url).filter(Boolean)
          : Array.isArray(data.extra_image_urls)
          ? data.extra_image_urls.filter(Boolean)
          : [];
        setExistingExtraUrls(extraUrls);
      } catch (err) {
        console.error("Failed to load product", err);
        toast({ type: "error", title: "Failed to load product", description: "Unable to fetch product details." });
        navigate("/seller/products", { replace: true });
      } finally {
        setLoadingProduct(false);
      }
    };

    loadProduct();
  }, [isEdit, productId, navigate, toast]);

  /* ===========================
     SUBMIT
  =========================== */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (!isEdit && files.length < 2) {
      setError("Please upload at least 2 images (1 main + 1 extra). Maximum 8 images allowed.");
      return;
    }
    if (isEdit && files.length > 0 && files.length < 2) {
      setError("To replace images, please upload at least 2 (1 main + 1 extra).");
      return;
    }

    try {
      setLoading(true);

      // 1) Upload images to server Cloudinary endpoint (add: up to 5, edit: 1 if replacing)
      const token = localStorage.getItem("token");
      const uploads: Array<{ image_url: string; public_id: string }> = [];

  const uploadTargets = files.slice(0, 8);
      for (const file of uploadTargets) {
        const fd = new FormData();
        fd.append("image", file);

        const res = await fetch(`${(window as any).__env?.API_URL || "import.meta.env.VITE_API_URL"}/product/upload-image`, {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Upload failed: ${res.status} ${txt}`);
        }

        const j = await res.json();
        uploads.push({ image_url: j.image_url, public_id: j.public_id });
      }

      if (isEdit && productId) {
        const main = uploads[0];
        await request(`/product/${productId}`, {
          method: "PUT",
          body: {
            title: formData.name,
            description: formData.description,
            price: Number(formData.price),
            discount_percent: Number(formData.discountPercent || 0),
            stock: Number(formData.stock),
            category_id: Number(formData.category),
            category_ids: formData.categories.map((c) => Number(c)),
            ...(main ? { image_url: main.image_url, public_id: main.public_id } : {}),
            ...(uploads.length >= 2 ? { extra_images: uploads.slice(1) } : {}),
            sizes: formData.sizes,
            size_prices: parseSizePricing(formData.sizePricing),
            colors: formData.colors,
            weight_kg: Number(formData.weightKg),
            length_cm: Number(formData.lengthCm),
            width_cm: Number(formData.widthCm),
            height_cm: Number(formData.heightCm),
          },
        });
        toast({ type: "success", title: "Product updated", description: "Your product was updated successfully" });
        navigate("/seller/products", { replace: true });
      } else {
        // 2) Submit product with main image + extra images
        const main = uploads[0];

        await request("/product/add", {
          method: "POST",
          body: {
            title: formData.name,
            description: formData.description,
            price: Number(formData.price),
            discount_percent: Number(formData.discountPercent || 0),
            stock: Number(formData.stock),
            category_id: Number(formData.category),
            category_ids: formData.categories.map((c) => Number(c)),
            image_url: main.image_url,
            public_id: main.public_id,
            extra_images: uploads.slice(1), // exclude main - server expects extra_images as array of others
            sizes: formData.sizes,
            size_prices: parseSizePricing(formData.sizePricing),
            colors: formData.colors,
            weight_kg: Number(formData.weightKg),
            length_cm: Number(formData.lengthCm),
            width_cm: Number(formData.widthCm),
            height_cm: Number(formData.heightCm),
          },
        });
        toast({ type: "success", title: "Product added", description: "Your product was added successfully" });
        navigate("/seller/products", { replace: true });
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || String(err));
      try {
        toast({ type: "error", title: isEdit ? "Failed to update product" : "Failed to add product", description: err?.message || String(err) });
      } catch {}
    } finally {
      setLoading(false);
    }
  };

  const openEditor = (index: number) => {
    const file = files[index];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setEditorSrc(reader.result as string);
      setEditorIndex(index);
      setEditorOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const applyEdits = async () => {
    if (editorIndex === null || !editorRef.current) return;
    try {
      const dataUrl = editorRef.current.toDataURL();
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const oldFile = files[editorIndex];
      const newFile = new File([blob], oldFile?.name ?? `edited-${Date.now()}.png`, {
        type: "image/png",
      });
      setFiles((prev) => prev.map((f, i) => (i === editorIndex ? newFile : f)));
      setEditorOpen(false);
      setEditorIndex(null);
    } catch (err) {
      console.error("Failed to apply edits", err);
    }
  };

  React.useEffect(() => {
    if (!editorOpen || !editorContainerRef.current) return;

    const editor = new TuiImageEditor(editorContainerRef.current, {
      includeUI: {
        loadImage: { path: editorSrc, name: "image" },
        menu: ["crop", "text", "shape", "icon", "filter"],
        initMenu: "crop",
        uiSize: { width: "100%", height: "520px" },
        menuBarPosition: "bottom",
      },
      cssMaxHeight: 520,
      cssMaxWidth: 1000,
      selectionStyle: {
        cornerSize: 16,
        rotatingPointOffset: 30,
      },
    });

    editorRef.current = editor;

    return () => {
      try {
        editor.destroy();
      } catch {}
      editorRef.current = null;
    };
  }, [editorOpen, editorSrc]);

  /* ===========================
     UI
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          <h1 className="text-3xl mb-6">{isEdit ? "Edit Product" : "Add New Product"}</h1>

          {loadingProduct ? (
            <div className="p-8">Loading product…</div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
            {/* LEFT */}
            <div className="space-y-6">
              <Input
                label="Product Name"
                placeholder="e.g., Brand New Shoes"
                value={formData.name}
                onChange={(v) =>
                  setFormData({ ...formData, name: v })
                }
              />

              <Textarea
                label="Description"
                placeholder="e.g., High-quality running shoes perfect for all terrains."
                value={formData.description}
                onChange={(v) =>
                  setFormData({ ...formData, description: v })
                }
              />

              <Input
                label="Price"
                type="number"
                placeholder="Enter the Price"
                value={formData.price}
                onChange={(v) =>
                  setFormData({ ...formData, price: v })
                }
              />

              <Input
                label="Discount (%)"
                type="number"
                placeholder="e.g., 10"
                value={formData.discountPercent}
                onChange={(v) =>
                  setFormData({ ...formData, discountPercent: v })
                }
                required={false}
              />

              <Input
                label="Stock"
                type="number"
                placeholder="Enter the stock available"
                value={formData.stock}
                onChange={(v) => setFormData({ ...formData, stock: v })}
              />

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
                <h2 className="text-xl mb-4">Shipping Package</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InlineInput
                    label="Weight (kg)"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={formData.weightKg}
                    onChange={(v) => setFormData({ ...formData, weightKg: v })}
                  />
                  <InlineInput
                    label="Length (cm)"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.lengthCm}
                    onChange={(v) => setFormData({ ...formData, lengthCm: v })}
                  />
                  <InlineInput
                    label="Width (cm)"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.widthCm}
                    onChange={(v) => setFormData({ ...formData, widthCm: v })}
                  />
                  <InlineInput
                    label="Height (cm)"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={formData.heightCm}
                    onChange={(v) => setFormData({ ...formData, heightCm: v })}
                  />
                </div>
              </div>

              <Input
                label="Sizes"
                placeholder="e.g., S, M, L, XL"
                value={formData.sizes}
                onChange={(v) => setFormData({ ...formData, sizes: v })}
              />

              <Input
                label="Size Price & Discount"
                placeholder="e.g., S:799:10, M:899:15, L:999"
                value={formData.sizePricing}
                onChange={(v) => setFormData({ ...formData, sizePricing: v })}
                required={false}
              />

              <Input
                label="Colors"
                placeholder="e.g., Red, Blue, Black"
                value={formData.colors}
                onChange={(v) => setFormData({ ...formData, colors: v })}
              />

              <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
                <label className="block mb-2">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData((prev) => {
                      const next = e.target.value;
                      const categories = prev.categories.includes(next)
                        ? prev.categories
                        : next
                          ? Array.from(new Set([next, ...prev.categories]))
                          : prev.categories;
                      return { ...prev, category: next, categories };
                    })
                  }
                  className="w-full px-4 py-3 rounded-xl border border-border bg-secondary mb-4"
                  required
                >
                  <option value="">Select primary category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="grid grid-cols-2 gap-2">
                  {categories.map((c) => {
                    const id = String(c.id);
                    const checked = formData.categories.includes(id);
                    return (
                      <label
                        key={id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer ${
                          checked ? "border-[#00B0FF] bg-[#00B0FF]/10" : "border-border bg-secondary"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="accent-[#00B0FF]"
                          checked={checked}
                          onChange={(e) => {
                            setFormData((prev) => {
                              const next = e.target.checked
                                ? Array.from(new Set([...prev.categories, id]))
                                : prev.categories.filter((x) => x !== id);
                              const primary = prev.category && next.includes(prev.category)
                                ? prev.category
                                : next[0] ?? "";
                              return { ...prev, categories: next, category: primary };
                            });
                          }}
                        />
                        <span>{c.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT */}
        <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
          <label className="block mb-4">Product Images {isEdit ? "(optional)" : "(min 2, max 8)"}</label>

              <div className="rounded-xl border-2 border-dashed border-border p-4">
                <div className="flex items-center gap-4 mb-3">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <div className="text-sm">Upload product images</div>
                    <div className="text-xs text-muted-foreground">First image will be used as main (big) view</div>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFilesChange}
                  className="hidden"
                />

                {/* Main image slot is the primary upload button */}

                {/* Preview grid: 1 large (left) + up to 7 small (right) */}
                <div className="flex gap-3">
                  {/* Big slot */}
                  <div
                    className="w-2/3 rounded overflow-hidden bg-slate-800 h-64 flex items-center justify-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) moveFile(dragIndex, 0);
                      setDragIndex(null);
                    }}
                  >
                    {files[0] ? (
                      <div className="relative w-full h-full">
                        <img
                          src={objectUrls[0]}
                          className="w-full h-full object-cover"
                          draggable
                          onDragStart={() => setDragIndex(0)}
                          onDragEnd={() => setDragIndex(null)}
                        />
                        <button
                          type="button"
                          onClick={() => removeFileAt(0)}
                          className="absolute top-2 left-2 p-2 bg-white/90 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditor(0)}
                          className="absolute inset-0 m-auto w-10 h-10 flex items-center justify-center bg-white/90 rounded-full"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : existingImageUrl && isEdit ? (
                      <div className="relative w-full h-full">
                        <img
                          src={existingImageUrl}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="absolute bottom-2 right-2 px-3 py-1 text-xs text-white bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] rounded"
                        >
                          Replace
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full h-full flex flex-col items-center justify-center text-white bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] rounded-xl border border-border p-6"
                      >
                        <div className="text-sm font-semibold">{isEdit ? "Add Image" : "Add Main Image"}</div>
                        <div className="text-xs opacity-90">
                          {isEdit ? "Replace current main image" : "First image will be used as main"}
                        </div>
                      </button>
                    )}
                  </div>

                  {/* Small slots (up to 7 extras) */}
                  <div className="w-1/3 grid grid-cols-2 gap-2 max-h-[520px] overflow-auto">
                    {Array.from({ length: 7 }).map((_, idx) => {
                      const pos = idx + 1; // positions 1..7
                      const file = files[pos];
                      return (
                        <div
                          key={pos}
                          className="rounded overflow-hidden bg-slate-800 h-32 relative flex items-center justify-center"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragIndex !== null) moveFile(dragIndex, pos);
                            setDragIndex(null);
                          }}
                        >
                          {file ? (
                            <>
                              <img
                                src={objectUrls[pos]}
                                className="w-full h-full object-cover"
                                draggable
                                onDragStart={() => setDragIndex(pos)}
                                onDragEnd={() => setDragIndex(null)}
                              />
                              <button
                                type="button"
                                onClick={() => removeFileAt(pos)}
                                className="absolute top-1 left-1 p-1 bg-white/90 rounded"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditor(pos)}
                                className="absolute inset-0 m-auto w-8 h-8 flex items-center justify-center bg-white/90 rounded-full"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            </>
                          ) : existingExtraUrls[pos - 1] ? (
                            <>
                              <img
                                src={existingExtraUrls[pos - 1]}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="absolute bottom-1 right-1 px-2 py-1 text-[10px] text-white bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] rounded"
                              >
                                Replace
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="text-xs text-white bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] px-2 py-1 rounded"
                            >
                              Add image
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {error && <p className="text-red-500 mt-2">{error}</p>}
              </div>
            </div>

            {/* ACTIONS */}
            <div className="lg:col-span-2 flex gap-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-6 py-3 border border-border rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                {loading ? "Saving…" : isEdit ? "Save Changes" : "Save Product"}
              </button>
            </div>
            </form>
          )}
        </div>
      </main>

      <Footer />

      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-[#1a1a1a] rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Edit Image</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-3 py-2 rounded-lg border border-border"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyEdits}
                  className="px-3 py-2 rounded-lg bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white"
                >
                  Apply
                </button>
              </div>
            </div>
            <div className="h-[520px]" ref={editorContainerRef} />
          </div>
        </div>
      )}
    </div>
  );
};

/* ===========================
   SMALL UI HELPERS
=========================== */

const Input = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) => (
  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
    <label className="block mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary"
      required={required}
    />
  </div>
);

const InlineInput = ({
  label,
  value,
  onChange,
  type = "text",
  step,
  min,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  step?: string;
  min?: string;
}) => (
  <div>
    <label className="block mb-2 text-sm">{label}</label>
    <input
      type={type}
      step={step}
      min={min}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary"
      required
    />
  </div>
);

const Textarea = ({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) => (
  <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
    <label className="block mb-2">{label}</label>
    <textarea
      rows={5}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl border border-border bg-secondary resize-none"
      required
    />
  </div>
);

export default AddProductPage;
