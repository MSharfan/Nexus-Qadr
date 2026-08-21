import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Monitor,
  Palette,
  Redo2,
  RotateCcw,
  Save,
  Smartphone,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import HomepageBanner, {
  BannerElement,
  HomepageBannerData,
  normalizeBanner,
} from "../shared/HomepageBanner";
import { bannerApi } from "../../config/api";

type PreviewMode = "desktop" | "mobile";

type BannerDraft = HomepageBannerData & {
  title: string;
  subtitle: string;
  is_enabled: boolean;
  show_banner: boolean;
  gradientFrom: string;
  gradientTo: string;
  image_url: string | null;
  mobile_image_url: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_position: "left" | "right" | "center";
  image_size: "small" | "medium" | "large";
  overlay_opacity: number;
  text_align: "left" | "center" | "right";
  padding_large: boolean;
  rounded: boolean;
  layout: string;
};

const HOME_PAGE_CACHE_KEY = "nexus_qadr_home_cache_v1";

const defaultBanner: BannerDraft = {
  title: "Welcome to Nexus Qadr",
  subtitle: "Discover products directly from verified sellers",
  is_enabled: true,
  show_banner: true,
  gradientFrom: "#0D47A1",
  gradientTo: "#00B0FF",
  image_url: null,
  mobile_image_url: null,
  cta_text: "Shop now",
  cta_url: "#",
  image_position: "right",
  image_size: "medium",
  overlay_opacity: 40,
  text_align: "left",
  padding_large: true,
  rounded: true,
  layout: "overlay",
  background_type: "gradient",
  background_color: "#0D47A1",
  gradient_angle: 90,
  background_image_url: "",
  background_position: "center",
  background_size: "cover",
  background_repeat: "no-repeat",
  text_color: "#ffffff",
  title_font_size: 40,
  mobile_title_font_size: 28,
  title_font_weight: 700,
  title_line_height: 1.12,
  title_letter_spacing: 0,
  subtitle_font_size: 18,
  mobile_subtitle_font_size: 15,
  subtitle_line_height: 1.55,
  subtitle_letter_spacing: 0,
  text_max_width: 640,
  desktop_height: 320,
  mobile_height: 360,
  desktop_padding: 48,
  mobile_padding: 24,
  element_gap: 24,
  content_width: 100,
  horizontal_align: "left",
  vertical_align: "center",
  mobile_text_align: "center",
  image_width: 240,
  image_height: 180,
  mobile_image_width: 220,
  mobile_image_height: 140,
  image_object_fit: "cover",
  image_radius: 16,
  image_shadow: true,
  overlay_enabled: true,
  overlay_color: "#000000",
  overlay_gradient_enabled: false,
  overlay_gradient_from: "#000000",
  overlay_gradient_to: "#0D47A1",
  overlay_gradient_angle: 90,
  button_bg_color: "#ffffff",
  button_text_color: "#0A0A0A",
  button_border_color: "transparent",
  button_border_width: 0,
  button_radius: 999,
  button_padding_x: 18,
  button_padding_y: 10,
  button_font_size: 14,
  button_hover_bg_color: "#F2F7FB",
  button_hover_text_color: "#0A0A0A",
  banner_radius: 24,
  banner_shadow: false,
  banner_border_color: "rgba(255,255,255,0.14)",
  banner_border_width: 0,
  banner_opacity: 100,
  animation: "none",
};

const presets: Array<{ name: string; description: string; patch: Partial<BannerDraft> }> = [
  {
    name: "Modern Blue",
    description: "Clean launch hero with bright cyan contrast.",
    patch: {
      gradientFrom: "#083A8C",
      gradientTo: "#00B0FF",
      gradient_angle: 105,
      overlay_opacity: 24,
      text_align: "left",
      horizontal_align: "left",
      layout: "overlay",
      title_font_weight: 700,
      button_bg_color: "#ffffff",
      button_text_color: "#072040",
    },
  },
  {
    name: "Product Promotion",
    description: "Split layout for product photography.",
    patch: {
      layout: "split-50",
      image_position: "right",
      gradientFrom: "#102033",
      gradientTo: "#0D47A1",
      overlay_opacity: 0,
      title_font_size: 34,
      desktop_height: 360,
      image_width: 360,
      image_height: 360,
      image_shadow: false,
    },
  },
  {
    name: "Sale",
    description: "High-contrast promotional banner.",
    patch: {
      title: "Limited Time Sale",
      subtitle: "Fresh deals from verified sellers are live now.",
      cta_text: "Shop deals",
      gradientFrom: "#101828",
      gradientTo: "#EF4444",
      gradient_angle: 125,
      overlay_opacity: 20,
      button_bg_color: "#00B0FF",
      button_text_color: "#03111F",
    },
  },
  {
    name: "New Arrivals",
    description: "Balanced editorial layout.",
    patch: {
      title: "New Arrivals",
      subtitle: "Explore the latest pieces selected for Nexus Qadr customers.",
      cta_text: "Explore",
      layout: "image-right",
      gradientFrom: "#0B1220",
      gradientTo: "#1565C0",
      text_align: "left",
      horizontal_align: "left",
      overlay_opacity: 0,
    },
  },
  {
    name: "Minimal",
    description: "Text-first banner with restrained styling.",
    patch: {
      layout: "text-only",
      background_type: "solid",
      background_color: "#111827",
      overlay_enabled: false,
      title_font_size: 36,
      subtitle_font_size: 16,
      text_align: "center",
      horizontal_align: "center",
      mobile_text_align: "center",
      banner_shadow: false,
    },
  },
  {
    name: "Image Right",
    description: "Classic text and product composition.",
    patch: {
      layout: "image-right",
      image_position: "right",
      overlay_opacity: 0,
      text_align: "left",
      horizontal_align: "left",
      image_width: 300,
      image_height: 220,
    },
  },
  {
    name: "Image Left",
    description: "Image-led composition for featured products.",
    patch: {
      layout: "image-left",
      image_position: "left",
      overlay_opacity: 0,
      text_align: "left",
      horizontal_align: "left",
      image_width: 300,
      image_height: 220,
    },
  },
  {
    name: "Centered",
    description: "Simple centered campaign message.",
    patch: {
      layout: "overlay",
      image_position: "center",
      text_align: "center",
      horizontal_align: "center",
      mobile_text_align: "center",
      text_max_width: 720,
      overlay_opacity: 50,
    },
  },
  {
    name: "Dark Gradient",
    description: "Premium dark storefront feel.",
    patch: {
      gradientFrom: "#050B16",
      gradientTo: "#123B60",
      gradient_angle: 135,
      overlay_opacity: 35,
      title_font_weight: 700,
      button_bg_color: "#00B0FF",
      button_text_color: "#04111F",
      banner_shadow: true,
    },
  },
  {
    name: "Seasonal",
    description: "Warm campaign styling without changing content.",
    patch: {
      gradientFrom: "#214E34",
      gradientTo: "#D97706",
      gradient_angle: 120,
      overlay_opacity: 28,
      button_bg_color: "#FFF7ED",
      button_text_color: "#1F2937",
    },
  },
];

const colorSwatches = [
  "#00B0FF",
  "#0D47A1",
  "#ffffff",
  "#0A0A0A",
  "#111827",
  "#EF4444",
  "#22C55E",
  "#F59E0B",
];

const getVisibilityFlag = (value: Partial<BannerDraft> | HomepageBannerData | null | undefined) => {
  const source = value as Record<string, unknown> | null | undefined;
  const next = Boolean(source?.show_banner ?? source?.is_enabled ?? source?.enabled ?? true);
  return next;
};

const mergeLoadedBanner = (value: any): BannerDraft => {
  const normalized = normalizeBanner(value);
  const visibility = getVisibilityFlag(normalized);

  return {
    ...defaultBanner,
    ...value,
    ...normalized,
    show_banner: visibility,
    is_enabled: visibility,
    title: String(normalized.title ?? defaultBanner.title),
    subtitle: String(normalized.subtitle ?? defaultBanner.subtitle),
    image_url: normalized.image_url ? String(normalized.image_url) : null,
    mobile_image_url: normalized.mobile_image_url ? String(normalized.mobile_image_url) : null,
    cta_text: normalized.cta_text ? String(normalized.cta_text) : null,
    cta_url: normalized.cta_url ? String(normalized.cta_url) : null,
    gradientFrom: String(normalized.gradientFrom ?? defaultBanner.gradientFrom),
    gradientTo: String(normalized.gradientTo ?? defaultBanner.gradientTo),
    overlay_opacity: Number(normalized.overlay_opacity ?? defaultBanner.overlay_opacity),
    padding_large: Boolean(normalized.padding_large),
    rounded: Boolean(normalized.rounded),
  };
};

const serialize = (draft: BannerDraft) => JSON.stringify(draft);

const toNullable = (value: unknown) => {
  if (typeof value !== "string") return value ?? null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const isValidCtaUrl = (value: string | null | undefined) => {
  if (!value) return true;
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) return true;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return true;

  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <label className="be-field">
    <span className="be-field-label">{label}</span>
    {children}
    {hint && <span className="be-field-hint">{hint}</span>}
  </label>
);

const TextField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}> = ({ label, value, onChange, placeholder, multiline }) => (
  <Field label={label}>
    {multiline ? (
      <textarea
        className="be-input be-textarea"
        value={value}
        placeholder={placeholder}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
      />
    ) : (
      <input
        className="be-input"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    )}
  </Field>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <Field label={label}>
    <select
      className="be-input be-select"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </Field>
);

const NumberField: React.FC<{
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (value: number) => void;
}> = ({ label, value, min = 0, max = 100, step = 1, suffix, onChange }) => (
  <Field label={label}>
    <div className="be-slider-row">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={Number(value ?? min)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <input
        className="be-input be-number"
        type="number"
        min={min}
        max={max}
        step={step}
        value={Number(value ?? min)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      {suffix && <span className="be-suffix">{suffix}</span>}
    </div>
  </Field>
);

const ToggleField: React.FC<{
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <label className="be-toggle-field">
    <span>{label}</span>
    <button
      type="button"
      className={`be-switch ${checked ? "is-on" : ""}`}
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
    >
      <span />
    </button>
  </label>
);

const ColorField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ label, value, onChange }) => (
  <Field label={label}>
    <div className="be-color-row">
      <input
        className="be-color-input"
        type="color"
        value={value || "#000000"}
        onChange={(event) => onChange(event.target.value)}
      />
      <input
        className="be-input"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
        placeholder="#00B0FF"
      />
    </div>
    <div className="be-swatches" aria-label={`${label} preset colors`}>
      {colorSwatches.map((color) => (
        <button
          key={color}
          type="button"
          style={{ backgroundColor: color }}
          className={value?.toLowerCase() === color.toLowerCase() ? "is-active" : ""}
          onClick={() => onChange(color)}
          aria-label={`Use ${color}`}
        />
      ))}
    </div>
  </Field>
);

const SegmentField: React.FC<{
  label: string;
  value: string;
  options: Array<{ label: string; value: string; icon?: React.ReactNode }>;
  onChange: (value: string) => void;
}> = ({ label, value, options, onChange }) => (
  <Field label={label}>
    <div className="be-segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? "is-active" : ""}
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  </Field>
);

const PanelSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen, children }) => (
  <details className="be-panel-section" open={defaultOpen}>
    <summary>
      <span className="be-section-icon">{icon}</span>
      <span>{title}</span>
    </summary>
    <div className="be-section-body">{children}</div>
  </details>
);

const elementLabel: Record<BannerElement, string> = {
  canvas: "Banner",
  title: "Title",
  subtitle: "Subtitle",
  image: "Image",
  button: "Button",
};

const BannerEditor: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [previewMode, setPreviewMode] = React.useState<PreviewMode>("desktop");
  const [selectedElement, setSelectedElement] = React.useState<BannerElement>("canvas");
  const [fullscreen, setFullscreen] = React.useState(false);
  const [history, setHistory] = React.useState<BannerDraft[]>([defaultBanner]);
  const [historyIndex, setHistoryIndex] = React.useState(0);
  const [lastSaved, setLastSaved] = React.useState(serialize(defaultBanner));

  const draft = history[historyIndex] ?? defaultBanner;
  const dirty = serialize(draft) !== lastSaved;
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const updateDraft = React.useCallback((patch: Partial<BannerDraft>) => {
    setHistory((current) => {
      const previous = current[historyIndex] ?? defaultBanner;
      const next = { ...previous, ...patch };
      const trimmed = current.slice(0, historyIndex + 1);
      return [...trimmed, next].slice(-80);
    });
    setHistoryIndex((index) => Math.min(index + 1, 79));
    setSuccess(null);
  }, [historyIndex]);

  const undo = () => {
    if (canUndo) setHistoryIndex((index) => index - 1);
  };

  const redo = () => {
    if (canRedo) setHistoryIndex((index) => index + 1);
  };

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const loaded = mergeLoadedBanner(await bannerApi.get());
        if (!mounted) return;
        setHistory([loaded]);
        setHistoryIndex(0);
        setLastSaved(serialize(loaded));
      } catch (err) {
        console.error(err);
        setError("Failed to load banner");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const guardedBack = () => {
    if (dirty && !window.confirm("You have unsaved banner changes. Leave without saving?")) {
      return;
    }
    navigate("/admin");
  };

  const resetToSaved = () => {
    if (!window.confirm("Discard unsaved changes and restore the last saved banner?")) return;
    const saved = JSON.parse(lastSaved) as BannerDraft;
    setHistory([saved]);
    setHistoryIndex(0);
    setSuccess(null);
    setError(null);
  };

  const applyPreset = (patch: Partial<BannerDraft>) => {
    updateDraft(patch);
    setSelectedElement("canvas");
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const result = await bannerApi.uploadImage(file);
      updateDraft({ image_url: result.image_url, mobile_image_url: result.image_url });
      setSelectedElement("image");
      setSuccess("Image uploaded");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!isValidCtaUrl(draft.cta_url)) {
      setError("CTA URL must be a valid http(s) URL, relative path, anchor, mailto, or tel link.");
      setSelectedElement("button");
      return;
    }

    try {
      setSaving(true);
      const visibility = getVisibilityFlag(draft);
      const payload = {
        ...draft,
        show_banner: visibility,
        is_enabled: visibility,
        title: draft.title.trim() || defaultBanner.title,
        subtitle: draft.subtitle.trim(),
        gradientFrom: draft.gradientFrom,
        gradientTo: draft.gradientTo,
        image_url: toNullable(draft.image_url),
        mobile_image_url: toNullable(draft.mobile_image_url),
        cta_text: toNullable(draft.cta_text),
        cta_url: toNullable(draft.cta_url),
        image_position: draft.image_position,
        image_size: draft.image_size,
        overlay_opacity: Number(draft.overlay_opacity),
        text_align: draft.text_align,
        padding_large: Boolean(draft.padding_large),
        rounded: Boolean(draft.rounded),
        layout: draft.layout,
      };

      const response: any = await bannerApi.update(payload);
      const saved = mergeLoadedBanner(response?.banner ?? payload);
      setHistory([saved]);
      setHistoryIndex(0);
      setLastSaved(serialize(saved));
      try {
        sessionStorage.removeItem(HOME_PAGE_CACHE_KEY);
      } catch {}
      setSuccess("Banner saved");
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Failed to save banner");
    } finally {
      setSaving(false);
    }
  };

  const propertyControls = () => {
    if (selectedElement === "title") {
      return (
        <>
          <TextField label="Title" value={draft.title} onChange={(title) => updateDraft({ title })} />
          <NumberField label="Font size" value={Number(draft.title_font_size)} min={18} max={72} onChange={(title_font_size) => updateDraft({ title_font_size })} suffix="px" />
          <NumberField label="Mobile font size" value={Number(draft.mobile_title_font_size)} min={16} max={48} onChange={(mobile_title_font_size) => updateDraft({ mobile_title_font_size })} suffix="px" />
          <SelectField label="Weight" value={String(draft.title_font_weight)} onChange={(title_font_weight) => updateDraft({ title_font_weight: Number(title_font_weight) })} options={[{ label: "Regular", value: "400" }, { label: "Medium", value: "500" }, { label: "Semibold", value: "600" }, { label: "Bold", value: "700" }]} />
          <ColorField label="Text color" value={String(draft.text_color)} onChange={(text_color) => updateDraft({ text_color })} />
          <NumberField label="Line height" value={Number(draft.title_line_height)} min={0.9} max={1.8} step={0.05} onChange={(title_line_height) => updateDraft({ title_line_height })} />
          <NumberField label="Letter spacing" value={Number(draft.title_letter_spacing)} min={0} max={8} step={0.25} onChange={(title_letter_spacing) => updateDraft({ title_letter_spacing })} suffix="px" />
        </>
      );
    }

    if (selectedElement === "subtitle") {
      return (
        <>
          <TextField label="Subtitle" value={draft.subtitle} multiline onChange={(subtitle) => updateDraft({ subtitle })} />
          <NumberField label="Font size" value={Number(draft.subtitle_font_size)} min={12} max={32} onChange={(subtitle_font_size) => updateDraft({ subtitle_font_size })} suffix="px" />
          <NumberField label="Mobile font size" value={Number(draft.mobile_subtitle_font_size)} min={11} max={24} onChange={(mobile_subtitle_font_size) => updateDraft({ mobile_subtitle_font_size })} suffix="px" />
          <ColorField label="Text color" value={String(draft.text_color)} onChange={(text_color) => updateDraft({ text_color })} />
          <NumberField label="Line height" value={Number(draft.subtitle_line_height)} min={1} max={2.2} step={0.05} onChange={(subtitle_line_height) => updateDraft({ subtitle_line_height })} />
          <NumberField label="Letter spacing" value={Number(draft.subtitle_letter_spacing)} min={0} max={6} step={0.25} onChange={(subtitle_letter_spacing) => updateDraft({ subtitle_letter_spacing })} suffix="px" />
        </>
      );
    }

    if (selectedElement === "image") {
      return (
        <>
          <TextField label="Image URL" value={draft.image_url ?? ""} onChange={(image_url) => updateDraft({ image_url: image_url || null })} />
          <TextField label="Mobile image URL" value={draft.mobile_image_url ?? ""} onChange={(mobile_image_url) => updateDraft({ mobile_image_url: mobile_image_url || null })} />
          <NumberField label="Desktop width" value={Number(draft.image_width)} min={80} max={520} onChange={(image_width) => updateDraft({ image_width })} suffix="px" />
          <NumberField label="Desktop height" value={Number(draft.image_height)} min={80} max={420} onChange={(image_height) => updateDraft({ image_height })} suffix="px" />
          <NumberField label="Mobile width" value={Number(draft.mobile_image_width)} min={80} max={320} onChange={(mobile_image_width) => updateDraft({ mobile_image_width })} suffix="px" />
          <NumberField label="Mobile height" value={Number(draft.mobile_image_height)} min={80} max={260} onChange={(mobile_image_height) => updateDraft({ mobile_image_height })} suffix="px" />
          <SelectField label="Object fit" value={String(draft.image_object_fit)} onChange={(image_object_fit) => updateDraft({ image_object_fit })} options={[{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }, { label: "Fill", value: "fill" }]} />
          <NumberField label="Radius" value={Number(draft.image_radius)} min={0} max={48} onChange={(image_radius) => updateDraft({ image_radius })} suffix="px" />
          <ToggleField label="Image shadow" checked={Boolean(draft.image_shadow)} onChange={(image_shadow) => updateDraft({ image_shadow })} />
        </>
      );
    }

    if (selectedElement === "button") {
      return (
        <>
          <TextField label="Button text" value={draft.cta_text ?? ""} onChange={(cta_text) => updateDraft({ cta_text: cta_text || null })} />
          <TextField label="CTA URL" value={draft.cta_url ?? ""} onChange={(cta_url) => updateDraft({ cta_url: cta_url || null })} />
          <ColorField label="Background" value={String(draft.button_bg_color)} onChange={(button_bg_color) => updateDraft({ button_bg_color })} />
          <ColorField label="Text color" value={String(draft.button_text_color)} onChange={(button_text_color) => updateDraft({ button_text_color })} />
          <ColorField label="Border color" value={String(draft.button_border_color === "transparent" ? "#ffffff" : draft.button_border_color)} onChange={(button_border_color) => updateDraft({ button_border_color })} />
          <NumberField label="Border width" value={Number(draft.button_border_width)} min={0} max={6} onChange={(button_border_width) => updateDraft({ button_border_width })} suffix="px" />
          <NumberField label="Radius" value={Number(draft.button_radius)} min={0} max={999} onChange={(button_radius) => updateDraft({ button_radius })} suffix="px" />
          <NumberField label="Horizontal padding" value={Number(draft.button_padding_x)} min={8} max={40} onChange={(button_padding_x) => updateDraft({ button_padding_x })} suffix="px" />
          <NumberField label="Vertical padding" value={Number(draft.button_padding_y)} min={6} max={24} onChange={(button_padding_y) => updateDraft({ button_padding_y })} suffix="px" />
          <NumberField label="Font size" value={Number(draft.button_font_size)} min={11} max={22} onChange={(button_font_size) => updateDraft({ button_font_size })} suffix="px" />
        </>
      );
    }

    return (
      <>
        <SelectField label="Layout" value={draft.layout} onChange={(layout) => updateDraft({ layout })} options={[{ label: "Overlay", value: "overlay" }, { label: "Text only", value: "text-only" }, { label: "Image left", value: "image-left" }, { label: "Image right", value: "image-right" }, { label: "Split 50/50", value: "split-50" }, { label: "Image background", value: "image-background" }]} />
        <NumberField label="Desktop height" value={Number(draft.desktop_height)} min={180} max={560} onChange={(desktop_height) => updateDraft({ desktop_height })} suffix="px" />
        <NumberField label="Mobile height" value={Number(draft.mobile_height)} min={220} max={560} onChange={(mobile_height) => updateDraft({ mobile_height })} suffix="px" />
        <NumberField label="Content width" value={Number(draft.content_width)} min={45} max={100} onChange={(content_width) => updateDraft({ content_width })} suffix="%" />
        <NumberField label="Text max width" value={Number(draft.text_max_width)} min={280} max={860} onChange={(text_max_width) => updateDraft({ text_max_width })} suffix="px" />
        <SegmentField label="Horizontal alignment" value={String(draft.horizontal_align)} onChange={(horizontal_align) => updateDraft({ horizontal_align })} options={[{ label: "Left", value: "left", icon: <AlignLeft size={15} /> }, { label: "Center", value: "center", icon: <AlignCenter size={15} /> }, { label: "Right", value: "right", icon: <AlignRight size={15} /> }]} />
        <SelectField label="Vertical alignment" value={String(draft.vertical_align)} onChange={(vertical_align) => updateDraft({ vertical_align })} options={[{ label: "Top", value: "top" }, { label: "Center", value: "center" }, { label: "Bottom", value: "bottom" }]} />
      </>
    );
  };

  return (
    <div className="min-h-screen flex flex-col be-admin-shell">
      <Header />

      <main className={`be-main ${fullscreen ? "is-fullscreen" : ""}`}>
        <div className="be-toolbar">
          <div className="be-toolbar-title">
            <button type="button" className="be-icon-button" onClick={guardedBack} aria-label="Back to admin">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1>Banner Editor</h1>
              <span className={dirty ? "be-dirty is-dirty" : "be-dirty"}>
                {dirty ? "Unsaved changes" : "Saved"}
              </span>
            </div>
          </div>

          <div className="be-toolbar-actions">
            <div className="be-view-toggle" aria-label="Preview size">
              <button type="button" className={previewMode === "desktop" ? "is-active" : ""} onClick={() => setPreviewMode("desktop")}>
                <Monitor size={16} />
                Desktop
              </button>
              <button type="button" className={previewMode === "mobile" ? "is-active" : ""} onClick={() => setPreviewMode("mobile")}>
                <Smartphone size={16} />
                Mobile
              </button>
            </div>
            <button type="button" className="be-icon-button" onClick={undo} disabled={!canUndo} aria-label="Undo">
              <Undo2 size={17} />
            </button>
            <button type="button" className="be-icon-button" onClick={redo} disabled={!canRedo} aria-label="Redo">
              <Redo2 size={17} />
            </button>
            <button type="button" className="be-icon-button" onClick={resetToSaved} disabled={!dirty} aria-label="Reset">
              <RotateCcw size={17} />
            </button>
            <button type="button" className="be-icon-button" onClick={() => setFullscreen((value) => !value)} aria-label="Fullscreen preview">
              <Maximize2 size={17} />
            </button>
            <button type="button" className="be-save-button" onClick={handleSave} disabled={saving || loading}>
              {saving ? <span className="be-spinner" /> : <Save size={17} />}
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="be-loading">Loading banner editor...</div>
        ) : (
          <div className="be-editor-grid">
            <aside className="be-left-panel" aria-label="Design controls">
              <div className="be-panel-heading">
                <span>Design Controls</span>
                <small>Presets and global settings</small>
              </div>

              <PanelSection title="Presets" icon={<Layers size={16} />} defaultOpen>
                <div className="be-presets">
                  {presets.map((preset) => (
                    <button key={preset.name} type="button" onClick={() => applyPreset(preset.patch)}>
                      <span>{preset.name}</span>
                      <small>{preset.description}</small>
                    </button>
                  ))}
                </div>
              </PanelSection>

              <PanelSection title="Content" icon={<Type size={16} />} defaultOpen>
                <ToggleField label="Enable banner on storefront" checked={Boolean(draft.show_banner ?? draft.is_enabled)} onChange={(show_banner) => updateDraft({ show_banner, is_enabled: show_banner })} />
                <TextField label="Banner title" value={draft.title} onChange={(title) => updateDraft({ title })} />
                <TextField label="Subtitle / description" value={draft.subtitle} multiline onChange={(subtitle) => updateDraft({ subtitle })} />
                <TextField label="CTA button text" value={draft.cta_text ?? ""} onChange={(cta_text) => updateDraft({ cta_text: cta_text || null })} />
                <TextField label="CTA URL" value={draft.cta_url ?? ""} onChange={(cta_url) => updateDraft({ cta_url: cta_url || null })} placeholder="/search or https://..." />
              </PanelSection>

              <PanelSection title="Typography" icon={<Type size={16} />}>
                <NumberField label="Title font size" value={Number(draft.title_font_size)} min={18} max={72} onChange={(title_font_size) => updateDraft({ title_font_size })} suffix="px" />
                <NumberField label="Subtitle font size" value={Number(draft.subtitle_font_size)} min={12} max={32} onChange={(subtitle_font_size) => updateDraft({ subtitle_font_size })} suffix="px" />
                <SelectField label="Font weight" value={String(draft.title_font_weight)} onChange={(title_font_weight) => updateDraft({ title_font_weight: Number(title_font_weight) })} options={[{ label: "Regular", value: "400" }, { label: "Medium", value: "500" }, { label: "Semibold", value: "600" }, { label: "Bold", value: "700" }]} />
                <ColorField label="Text color" value={String(draft.text_color)} onChange={(text_color) => updateDraft({ text_color })} />
                <NumberField label="Line height" value={Number(draft.title_line_height)} min={0.9} max={1.8} step={0.05} onChange={(title_line_height) => updateDraft({ title_line_height })} />
                <NumberField label="Letter spacing" value={Number(draft.title_letter_spacing)} min={0} max={8} step={0.25} onChange={(title_letter_spacing) => updateDraft({ title_letter_spacing })} suffix="px" />
                <SegmentField label="Text alignment" value={draft.text_align} onChange={(text_align) => updateDraft({ text_align: text_align as BannerDraft["text_align"] })} options={[{ label: "Left", value: "left", icon: <AlignLeft size={15} /> }, { label: "Center", value: "center", icon: <AlignCenter size={15} /> }, { label: "Right", value: "right", icon: <AlignRight size={15} /> }]} />
                <NumberField label="Text max width" value={Number(draft.text_max_width)} min={280} max={860} onChange={(text_max_width) => updateDraft({ text_max_width })} suffix="px" />
              </PanelSection>

              <PanelSection title="Background" icon={<Palette size={16} />}>
                <SegmentField label="Background type" value={String(draft.background_type)} onChange={(background_type) => updateDraft({ background_type })} options={[{ label: "Gradient", value: "gradient" }, { label: "Solid", value: "solid" }]} />
                <ColorField label="Solid color" value={String(draft.background_color)} onChange={(background_color) => updateDraft({ background_color })} />
                <NumberField label="Gradient angle" value={Number(draft.gradient_angle)} min={0} max={360} onChange={(gradient_angle) => updateDraft({ gradient_angle })} suffix="deg" />
                <ColorField label="Gradient start" value={draft.gradientFrom} onChange={(gradientFrom) => updateDraft({ gradientFrom })} />
                <ColorField label="Gradient end" value={draft.gradientTo} onChange={(gradientTo) => updateDraft({ gradientTo })} />
                <TextField label="Background image URL" value={String(draft.background_image_url ?? "")} onChange={(background_image_url) => updateDraft({ background_image_url })} />
                <SelectField label="Background position" value={String(draft.background_position)} onChange={(background_position) => updateDraft({ background_position })} options={[{ label: "Center", value: "center" }, { label: "Top", value: "top" }, { label: "Bottom", value: "bottom" }, { label: "Left", value: "left" }, { label: "Right", value: "right" }]} />
                <SelectField label="Background size" value={String(draft.background_size)} onChange={(background_size) => updateDraft({ background_size })} options={[{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }, { label: "Auto", value: "auto" }]} />
                <SelectField label="Background repeat" value={String(draft.background_repeat)} onChange={(background_repeat) => updateDraft({ background_repeat })} options={[{ label: "No repeat", value: "no-repeat" }, { label: "Repeat", value: "repeat" }, { label: "Repeat X", value: "repeat-x" }, { label: "Repeat Y", value: "repeat-y" }]} />
              </PanelSection>

              <PanelSection title="Image" icon={<ImageIcon size={16} />}>
                <input ref={fileInputRef} type="file" accept="image/*" className="be-file-input" onChange={handleUpload} />
                <div className="be-upload-card">
                  {draft.image_url ? (
                    <img src={draft.image_url} alt="Current banner" />
                  ) : (
                    <div className="be-upload-empty"><ImageIcon size={22} />No image selected</div>
                  )}
                  <div className="be-upload-actions">
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                      <Upload size={15} />
                      {uploading ? "Uploading" : draft.image_url ? "Replace" : "Upload"}
                    </button>
                    {draft.image_url && (
                      <button type="button" onClick={() => updateDraft({ image_url: null, mobile_image_url: null })}>
                        <X size={15} />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <TextField label="Image URL" value={draft.image_url ?? ""} onChange={(image_url) => updateDraft({ image_url: image_url || null })} />
                <TextField label="Mobile image URL" value={draft.mobile_image_url ?? ""} onChange={(mobile_image_url) => updateDraft({ mobile_image_url: mobile_image_url || null })} />
                <SelectField label="Image position" value={draft.image_position} onChange={(image_position) => updateDraft({ image_position: image_position as BannerDraft["image_position"] })} options={[{ label: "Left", value: "left" }, { label: "Right", value: "right" }, { label: "Center", value: "center" }]} />
                <SelectField label="Image size" value={draft.image_size} onChange={(image_size) => updateDraft({ image_size: image_size as BannerDraft["image_size"] })} options={[{ label: "Small", value: "small" }, { label: "Medium", value: "medium" }, { label: "Large", value: "large" }]} />
                <SelectField label="Object fit" value={String(draft.image_object_fit)} onChange={(image_object_fit) => updateDraft({ image_object_fit })} options={[{ label: "Cover", value: "cover" }, { label: "Contain", value: "contain" }, { label: "Fill", value: "fill" }]} />
                <NumberField label="Border radius" value={Number(draft.image_radius)} min={0} max={48} onChange={(image_radius) => updateDraft({ image_radius })} suffix="px" />
                <ToggleField label="Image shadow" checked={Boolean(draft.image_shadow)} onChange={(image_shadow) => updateDraft({ image_shadow })} />
              </PanelSection>

              <PanelSection title="Overlay" icon={<Layers size={16} />}>
                <ToggleField label="Enable overlay" checked={Boolean(draft.overlay_enabled)} onChange={(overlay_enabled) => updateDraft({ overlay_enabled })} />
                <ColorField label="Overlay color" value={String(draft.overlay_color)} onChange={(overlay_color) => updateDraft({ overlay_color })} />
                <NumberField label="Overlay opacity" value={Number(draft.overlay_opacity)} min={0} max={100} onChange={(overlay_opacity) => updateDraft({ overlay_opacity })} suffix="%" />
                <ToggleField label="Gradient overlay" checked={Boolean(draft.overlay_gradient_enabled)} onChange={(overlay_gradient_enabled) => updateDraft({ overlay_gradient_enabled })} />
                <ColorField label="Overlay start" value={String(draft.overlay_gradient_from)} onChange={(overlay_gradient_from) => updateDraft({ overlay_gradient_from })} />
                <ColorField label="Overlay end" value={String(draft.overlay_gradient_to)} onChange={(overlay_gradient_to) => updateDraft({ overlay_gradient_to })} />
              </PanelSection>

              <PanelSection title="Button" icon={<Check size={16} />}>
                <TextField label="Button text" value={draft.cta_text ?? ""} onChange={(cta_text) => updateDraft({ cta_text: cta_text || null })} />
                <ColorField label="Button background" value={String(draft.button_bg_color)} onChange={(button_bg_color) => updateDraft({ button_bg_color })} />
                <ColorField label="Button text" value={String(draft.button_text_color)} onChange={(button_text_color) => updateDraft({ button_text_color })} />
                <NumberField label="Border radius" value={Number(draft.button_radius)} min={0} max={999} onChange={(button_radius) => updateDraft({ button_radius })} suffix="px" />
                <NumberField label="Padding X" value={Number(draft.button_padding_x)} min={8} max={40} onChange={(button_padding_x) => updateDraft({ button_padding_x })} suffix="px" />
                <NumberField label="Padding Y" value={Number(draft.button_padding_y)} min={6} max={24} onChange={(button_padding_y) => updateDraft({ button_padding_y })} suffix="px" />
                <NumberField label="Font size" value={Number(draft.button_font_size)} min={11} max={22} onChange={(button_font_size) => updateDraft({ button_font_size })} suffix="px" />
              </PanelSection>

              <PanelSection title="Layout" icon={<Layers size={16} />}>
                <SelectField label="Image/content layout" value={draft.layout} onChange={(layout) => updateDraft({ layout })} options={[{ label: "Overlay", value: "overlay" }, { label: "Text only", value: "text-only" }, { label: "Text + image left", value: "image-left" }, { label: "Text + image right", value: "image-right" }, { label: "50/50 split", value: "split-50" }, { label: "Image background", value: "image-background" }]} />
                <NumberField label="Desktop height" value={Number(draft.desktop_height)} min={180} max={560} onChange={(desktop_height) => updateDraft({ desktop_height })} suffix="px" />
                <NumberField label="Mobile height" value={Number(draft.mobile_height)} min={220} max={560} onChange={(mobile_height) => updateDraft({ mobile_height })} suffix="px" />
                <NumberField label="Desktop padding" value={Number(draft.desktop_padding)} min={16} max={96} onChange={(desktop_padding) => updateDraft({ desktop_padding })} suffix="px" />
                <NumberField label="Mobile padding" value={Number(draft.mobile_padding)} min={12} max={56} onChange={(mobile_padding) => updateDraft({ mobile_padding })} suffix="px" />
                <NumberField label="Element gap" value={Number(draft.element_gap)} min={8} max={64} onChange={(element_gap) => updateDraft({ element_gap })} suffix="px" />
                <NumberField label="Content width" value={Number(draft.content_width)} min={45} max={100} onChange={(content_width) => updateDraft({ content_width })} suffix="%" />
                <SegmentField label="Horizontal" value={String(draft.horizontal_align)} onChange={(horizontal_align) => updateDraft({ horizontal_align })} options={[{ label: "Left", value: "left", icon: <AlignLeft size={15} /> }, { label: "Center", value: "center", icon: <AlignCenter size={15} /> }, { label: "Right", value: "right", icon: <AlignRight size={15} /> }]} />
                <SelectField label="Vertical" value={String(draft.vertical_align)} onChange={(vertical_align) => updateDraft({ vertical_align })} options={[{ label: "Top", value: "top" }, { label: "Center", value: "center" }, { label: "Bottom", value: "bottom" }]} />
                <SegmentField label="Mobile text" value={String(draft.mobile_text_align)} onChange={(mobile_text_align) => updateDraft({ mobile_text_align })} options={[{ label: "Left", value: "left", icon: <AlignLeft size={15} /> }, { label: "Center", value: "center", icon: <AlignCenter size={15} /> }, { label: "Right", value: "right", icon: <AlignRight size={15} /> }]} />
              </PanelSection>

              <PanelSection title="Effects" icon={<Palette size={16} />}>
                <ToggleField label="Rounded banner" checked={Boolean(draft.rounded)} onChange={(rounded) => updateDraft({ rounded })} />
                <NumberField label="Banner radius" value={Number(draft.banner_radius)} min={0} max={48} onChange={(banner_radius) => updateDraft({ banner_radius })} suffix="px" />
                <ToggleField label="Box shadow" checked={Boolean(draft.banner_shadow)} onChange={(banner_shadow) => updateDraft({ banner_shadow })} />
                <NumberField label="Border width" value={Number(draft.banner_border_width)} min={0} max={6} onChange={(banner_border_width) => updateDraft({ banner_border_width })} suffix="px" />
                <ColorField label="Border color" value={String(draft.banner_border_color).startsWith("#") ? String(draft.banner_border_color) : "#ffffff"} onChange={(banner_border_color) => updateDraft({ banner_border_color })} />
                <NumberField label="Opacity" value={Number(draft.banner_opacity)} min={20} max={100} onChange={(banner_opacity) => updateDraft({ banner_opacity })} suffix="%" />
                <SelectField label="Animation" value={String(draft.animation)} onChange={(animation) => updateDraft({ animation })} options={[{ label: "None", value: "none" }, { label: "Subtle float", value: "float" }]} />
              </PanelSection>
            </aside>

            <section className="be-canvas-panel" aria-label="Live banner preview">
              <div className="be-canvas-head">
                <div>
                  <span>Live Preview</span>
                  <small>{previewMode === "desktop" ? "Storefront desktop" : "Storefront mobile"}</small>
                </div>
                <div className="be-selected-chip">
                  Selected: <strong>{elementLabel[selectedElement]}</strong>
                </div>
              </div>

              <div className={`be-canvas-workspace is-${previewMode}`}>
                <div className="be-ruler">Actual storefront proportions</div>
                <div className="be-preview-frame">
                  <HomepageBanner
                    banner={draft}
                    mode={previewMode}
                    editorPreview
                    selectedElement={selectedElement}
                    onSelectElement={setSelectedElement}
                  />
                </div>
              </div>

              {(error || success) && (
                <div className={error ? "be-message is-error" : "be-message is-success"}>
                  {error || success}
                </div>
              )}
            </section>

            <aside className="be-right-panel" aria-label="Element properties">
              <div className="be-panel-heading">
                <span>{elementLabel[selectedElement]} Properties</span>
                <small>Click an element in the preview to focus controls</small>
              </div>
              <div className="be-property-list">{propertyControls()}</div>
            </aside>
          </div>
        )}
      </main>

      {!fullscreen && <Footer />}
    </div>
  );
};

export default BannerEditor;
