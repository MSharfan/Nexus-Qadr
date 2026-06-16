import React from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { bannerApi } from "../../config/api";

const BannerEditor: React.FC = () => {
  const navigate = useNavigate();

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [title, setTitle] = React.useState("");
  const [subtitle, setSubtitle] = React.useState("");
  const [gradientFrom, setGradientFrom] = React.useState("#0D47A1");
  const [gradientTo, setGradientTo] = React.useState("#00B0FF");
  const [imageUrl, setImageUrl] = React.useState<string | null>(null);
  // Extended banner options
  const [mobileImageUrl, setMobileImageUrl] = React.useState<string | null>(null);
  const [ctaText, setCtaText] = React.useState<string | null>(null);
  const [ctaUrl, setCtaUrl] = React.useState<string | null>(null);
  const [imagePosition, setImagePosition] = React.useState<"left" | "right" | "center">("right");
  const [imageSize, setImageSize] = React.useState<"small" | "medium" | "large">("medium");
  const [overlayOpacity, setOverlayOpacity] = React.useState<number>(40);
  const [textAlign, setTextAlign] = React.useState<"left" | "center" | "right">("left");
  const [paddingLarge, setPaddingLarge] = React.useState<boolean>(true);
  const [rounded, setRounded] = React.useState<boolean>(true);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const b = await bannerApi.get();
        if (!mounted) return;
        if (b) {
          setTitle(b.title ?? "");
          setSubtitle(b.subtitle ?? "");
          setGradientFrom(b.gradientFrom ?? "#0D47A1");
          setGradientTo(b.gradientTo ?? "#00B0FF");
          setImageUrl(b.image_url ?? b.imageUrl ?? null);
          setMobileImageUrl(b.mobile_image_url ?? b.mobileImageUrl ?? null);
          setCtaText(b.cta_text ?? b.ctaText ?? null);
          setCtaUrl(b.cta_url ?? b.ctaUrl ?? null);
          setImagePosition(b.image_position ?? b.imagePosition ?? "right");
          setImageSize(b.image_size ?? b.imageSize ?? "medium");
          setOverlayOpacity(typeof b.overlay_opacity === 'number' ? b.overlay_opacity : (b.overlayOpacity ?? 40));
          setTextAlign(b.text_align ?? b.textAlign ?? "left");
          setPaddingLarge(Boolean(b.padding_large ?? b.paddingLarge ?? true));
          setRounded(Boolean(b.rounded ?? true));
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load banner");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title,
        subtitle,
        gradientFrom,
        gradientTo,
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl,
        cta_text: ctaText,
        cta_url: ctaUrl,
        image_position: imagePosition,
        image_size: imageSize,
        overlay_opacity: overlayOpacity,
        text_align: textAlign,
        padding_large: paddingLarge,
        rounded,
      };

      await bannerApi.update(payload);

      try {
        const { toast } = await import("sonner");
        toast.success("Banner updated");
      } catch {}

      navigate("/admin");
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl mb-4">Edit Homepage Banner</h1>

          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-border">
                <label className="block mb-2 text-sm">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2 border rounded mb-4 bg-transparent"
                />

                <label className="block mb-2 text-sm">Subtitle</label>
                <textarea
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full p-2 border rounded mb-4 bg-transparent"
                  rows={4}
                />

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 text-sm">Gradient From</label>
                    <input
                      type="color"
                      value={gradientFrom}
                      onChange={(e) => setGradientFrom(e.target.value)}
                      className="w-full h-10 p-1 rounded"
                    />
                  </div>

                  <div>
                    <label className="block mb-2 text-sm">Gradient To</label>
                    <input
                      type="color"
                      value={gradientTo}
                      onChange={(e) => setGradientTo(e.target.value)}
                      className="w-full h-10 p-1 rounded"
                    />
                  </div>
                </div>

                <label className="block mb-2 text-sm">Mobile Image URL (optional)</label>
                <input
                  value={mobileImageUrl ?? ""}
                  onChange={(e) => setMobileImageUrl(e.target.value || null)}
                  className="w-full p-2 border rounded mb-4 bg-transparent"
                />

                <label className="block mb-2 text-sm">CTA Text (optional)</label>
                <input
                  value={ctaText ?? ""}
                  onChange={(e) => setCtaText(e.target.value || null)}
                  className="w-full p-2 border rounded mb-4 bg-transparent"
                />

                <label className="block mb-2 text-sm">CTA URL (optional)</label>
                <input
                  value={ctaUrl ?? ""}
                  onChange={(e) => setCtaUrl(e.target.value || null)}
                  className="w-full p-2 border rounded mb-4 bg-transparent"
                />

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block mb-2 text-sm">Image Position</label>
                    <select value={imagePosition} onChange={(e) => setImagePosition(e.target.value as any)} className="w-full p-2 rounded bg-transparent border">
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                      <option value="center">Center</option>
                    </select>
                  </div>

                  <div>
                    <label className="block mb-2 text-sm">Image Size</label>
                    <select value={imageSize} onChange={(e) => setImageSize(e.target.value as any)} className="w-full p-2 rounded bg-transparent border">
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>

                <label className="block mb-2 text-sm">Overlay opacity (%)</label>
                <input type="range" min={0} max={100} value={overlayOpacity} onChange={(e) => setOverlayOpacity(Number(e.target.value))} className="w-full mb-4" />

                <label className="block mb-2 text-sm">Text alignment</label>
                <select value={textAlign} onChange={(e) => setTextAlign(e.target.value as any)} className="w-full p-2 rounded bg-transparent border mb-4">
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>

                <div className="flex items-center gap-4 mb-4">
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={paddingLarge} onChange={(e) => setPaddingLarge(e.target.checked)} /> Large padding</label>
                  <label className="inline-flex items-center gap-2"><input type="checkbox" checked={rounded} onChange={(e) => setRounded(e.target.checked)} /> Rounded</label>
                </div>

                <label className="block mb-2 text-sm">Image URL (optional)</label>
                <input
                  value={imageUrl ?? ""}
                  onChange={(e) => setImageUrl(e.target.value || null)}
                  className="w-full p-2 border rounded mb-4 bg-transparent"
                />

                {error && <div className="text-red-500 mb-2">{error}</div>}

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-[#00B0FF] text-white rounded"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>

                  <button
                    onClick={() => navigate("/admin")}
                    className="px-4 py-2 border rounded"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-4">Preview</div>
                <div
                  className={`relative overflow-hidden h-64 shadow ${rounded ? 'rounded-xl' : ''}`}
                  style={{
                    background: `linear-gradient(90deg, ${gradientFrom}, ${gradientTo})`,
                  }}
                >
                  <div className={`h-full flex items-center ${paddingLarge ? 'p-8' : 'p-4'}`}>
                    {/* Overlay layer (controls darkness over gradient/image) - scoped to preview only */}
                    <div className="absolute inset-0" style={{ background: `rgba(0,0,0,${overlayOpacity / 100})`, pointerEvents: 'none', zIndex: 0 }} />

                    {/* Content container */}
                    <div className={`relative w-full flex items-center justify-between gap-4 ${textAlign === 'center' ? 'justify-center' : textAlign === 'right' ? 'justify-between' : ''}`}>
                      {/* Text area */}
                      <div className={`relative z-10 max-w-md text-white ${textAlign === 'center' ? 'text-center mx-auto' : textAlign === 'right' ? 'text-right ml-auto' : 'text-left'}`}>
                        <h2 className="text-3xl font-bold mb-2">{title || 'Your title here'}</h2>
                        <p className="opacity-90 mb-4">{subtitle || 'Subtitle goes here'}</p>
                        {ctaText && (
                          <a href={ctaUrl || '#'} className="inline-block bg-white text-[#0A0A0A] px-4 py-2 rounded shadow">{ctaText}</a>
                        )}
                      </div>

                      {/* Image area (positioned based on selection) */}
                      {imageUrl && imagePosition !== 'center' && (
                        <div className={`relative z-10 flex-shrink-0 ${imagePosition === 'left' ? 'mr-4' : 'ml-4'}`}>
                          <img
                            src={imageUrl}
                            alt="banner"
                            className={`${imageSize === 'small' ? 'h-24' : imageSize === 'large' ? 'h-56' : 'h-40'} object-cover rounded`}
                          />
                        </div>
                      )}

                      {/* Center image option */}
                      {imageUrl && imagePosition === 'center' && (
                        <div className="absolute inset-0 flex items-center justify-center z-0">
                          <img src={imageUrl} alt="banner" className="object-contain opacity-90 h-44" />
                        </div>
                      )}

                      {/* Mobile image preview (small badge) */}
                      {mobileImageUrl && (
                        <img src={mobileImageUrl} alt="mobile" className="hidden md:block relative z-10 h-14 w-14 object-cover rounded-full ml-4" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default BannerEditor;
