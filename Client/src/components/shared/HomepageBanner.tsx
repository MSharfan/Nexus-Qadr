import React from "react";

export type BannerElement = "title" | "subtitle" | "image" | "button" | "canvas";

export type HomepageBannerData = {
  title?: string | null;
  subtitle?: string | null;
  is_enabled?: boolean | null;
  enabled?: boolean | null;
  show_banner?: boolean | null;
  gradientFrom?: string | null;
  gradientTo?: string | null;
  gradient_from?: string | null;
  gradient_to?: string | null;
  image_url?: string | null;
  imageUrl?: string | null;
  mobile_image_url?: string | null;
  mobileImageUrl?: string | null;
  cta_text?: string | null;
  ctaText?: string | null;
  cta_url?: string | null;
  ctaUrl?: string | null;
  image_position?: "left" | "right" | "center" | null;
  imagePosition?: "left" | "right" | "center" | null;
  image_size?: "small" | "medium" | "large" | null;
  imageSize?: "small" | "medium" | "large" | null;
  overlay_opacity?: number | null;
  overlayOpacity?: number | null;
  text_align?: "left" | "center" | "right" | null;
  textAlign?: "left" | "center" | "right" | null;
  padding_large?: boolean | null;
  paddingLarge?: boolean | null;
  rounded?: boolean | null;
  layout?: string | null;
  [key: string]: unknown;
};

type HomepageBannerProps = {
  banner?: HomepageBannerData | null;
  mode?: "desktop" | "mobile";
  selectedElement?: BannerElement;
  onSelectElement?: (element: BannerElement) => void;
  editorPreview?: boolean;
  className?: string;
};

const fallbackBanner: HomepageBannerData = {
  title: "Welcome to Nexus Qadr",
  subtitle: "Discover products directly from verified sellers",
  gradientFrom: "#0D47A1",
  gradientTo: "#00B0FF",
  image_url: null,
  mobile_image_url: null,
  cta_text: null,
  cta_url: null,
  image_position: "right",
  image_size: "medium",
  overlay_opacity: 40,
  text_align: "left",
  padding_large: true,
  rounded: true,
  layout: "overlay",
};

const asString = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const asNumber = (value: unknown, fallback: number) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const asBoolean = (value: unknown, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const selectClass = (element: BannerElement, selected?: BannerElement) =>
  selected === element ? " nq-banner-selected" : "";

export const normalizeBanner = (banner?: HomepageBannerData | null): HomepageBannerData => {
  const b = { ...fallbackBanner, ...(banner ?? {}) };
  const isVisible = asBoolean(b.show_banner ?? b.is_enabled ?? b.enabled ?? true, true);

  return {
    ...b,
    show_banner: isVisible,
    is_enabled: isVisible,
    enabled: isVisible,
    gradientFrom: asString(b.gradientFrom ?? b.gradient_from, fallbackBanner.gradientFrom!),
    gradientTo: asString(b.gradientTo ?? b.gradient_to, fallbackBanner.gradientTo!),
    image_url: asString(b.image_url ?? b.imageUrl, ""),
    mobile_image_url: asString(b.mobile_image_url ?? b.mobileImageUrl, ""),
    cta_text: asString(b.cta_text ?? b.ctaText, ""),
    cta_url: asString(b.cta_url ?? b.ctaUrl, ""),
    image_position: (b.image_position ?? b.imagePosition ?? "right") as "left" | "right" | "center",
    image_size: (b.image_size ?? b.imageSize ?? "medium") as "small" | "medium" | "large",
    overlay_opacity: clamp(asNumber(b.overlay_opacity ?? b.overlayOpacity, 40), 0, 100),
    text_align: (b.text_align ?? b.textAlign ?? "left") as "left" | "center" | "right",
    padding_large: asBoolean(b.padding_large ?? b.paddingLarge, true),
    rounded: asBoolean(b.rounded, true),
    layout: asString(b.layout, "overlay"),
  };
};

export const buildBannerStyle = (
  banner?: HomepageBannerData | null,
): React.CSSProperties => {
  const b = normalizeBanner(banner);
  const backgroundType = asString(b.background_type, "gradient");
  const gradientAngle = asNumber(b.gradient_angle, 90);
  const gradientFrom = asString(b.gradientFrom, "#0D47A1");
  const gradientTo = asString(b.gradientTo, "#00B0FF");
  const backgroundColor = asString(b.background_color, gradientFrom);
  const borderWidth = asNumber(b.banner_border_width, 0);
  const overlayBackground = asBoolean(b.overlay_gradient_enabled, false)
    ? `linear-gradient(${asNumber(b.overlay_gradient_angle, 90)}deg, ${asString(b.overlay_gradient_from, "#000000")}, ${asString(b.overlay_gradient_to, "#0D47A1")})`
    : asString(b.overlay_color, "#000000");

  const style = {
    "--nq-banner-gradient-from": gradientFrom,
    "--nq-banner-gradient-to": gradientTo,
    "--nq-banner-gradient-angle": `${gradientAngle}deg`,
    "--nq-banner-solid": backgroundColor,
    "--nq-banner-text-color": asString(b.text_color, "#ffffff"),
    "--nq-banner-title-size": `${asNumber(b.title_font_size, 40)}px`,
    "--nq-banner-mobile-title-size": `${asNumber(b.mobile_title_font_size, 28)}px`,
    "--nq-banner-title-weight": String(asNumber(b.title_font_weight, 700)),
    "--nq-banner-title-line": String(asNumber(b.title_line_height, 1.12)),
    "--nq-banner-title-spacing": `${asNumber(b.title_letter_spacing, 0)}px`,
    "--nq-banner-subtitle-size": `${asNumber(b.subtitle_font_size, 18)}px`,
    "--nq-banner-mobile-subtitle-size": `${asNumber(b.mobile_subtitle_font_size, 15)}px`,
    "--nq-banner-subtitle-line": String(asNumber(b.subtitle_line_height, 1.55)),
    "--nq-banner-subtitle-spacing": `${asNumber(b.subtitle_letter_spacing, 0)}px`,
    "--nq-banner-text-width": `${asNumber(b.text_max_width, 640)}px`,
    "--nq-banner-height": `${asNumber(b.desktop_height, 320)}px`,
    "--nq-banner-mobile-height": `${asNumber(b.mobile_height, 360)}px`,
    "--nq-banner-padding": `${asNumber(b.desktop_padding, b.padding_large === false ? 32 : 48)}px`,
    "--nq-banner-mobile-padding": `${asNumber(b.mobile_padding, 24)}px`,
    "--nq-banner-gap": `${asNumber(b.element_gap, 24)}px`,
    "--nq-banner-content-width": `${asNumber(b.content_width, 100)}%`,
    "--nq-banner-radius": `${b.rounded === false ? 0 : asNumber(b.banner_radius, 24)}px`,
    "--nq-banner-opacity": String(clamp(asNumber(b.banner_opacity, 100), 0, 100) / 100),
    "--nq-banner-border-width": `${borderWidth}px`,
    "--nq-banner-border-color": asString(b.banner_border_color, "rgba(255,255,255,0.14)"),
    "--nq-banner-shadow": asBoolean(b.banner_shadow, false)
      ? "0 24px 70px rgba(0, 0, 0, 0.28)"
      : "none",
    "--nq-banner-overlay": overlayBackground,
    "--nq-banner-overlay-opacity": String(
      asBoolean(b.overlay_enabled, true)
        ? clamp(asNumber(b.overlay_opacity ?? b.overlayOpacity, 40), 0, 100) / 100
        : 0,
    ),
    "--nq-banner-image-width": `${asNumber(b.image_width, 240)}px`,
    "--nq-banner-image-height": `${asNumber(b.image_height, 180)}px`,
    "--nq-banner-mobile-image-width": `${asNumber(b.mobile_image_width, 220)}px`,
    "--nq-banner-mobile-image-height": `${asNumber(b.mobile_image_height, 140)}px`,
    "--nq-banner-image-radius": `${asNumber(b.image_radius, 16)}px`,
    "--nq-banner-button-bg": asString(b.button_bg_color, "#ffffff"),
    "--nq-banner-button-color": asString(b.button_text_color, "#0A0A0A"),
    "--nq-banner-button-border-color": asString(b.button_border_color, "transparent"),
    "--nq-banner-button-border-width": `${asNumber(b.button_border_width, 0)}px`,
    "--nq-banner-button-radius": `${asNumber(b.button_radius, 999)}px`,
    "--nq-banner-button-px": `${asNumber(b.button_padding_x, 18)}px`,
    "--nq-banner-button-py": `${asNumber(b.button_padding_y, 10)}px`,
    "--nq-banner-button-size": `${asNumber(b.button_font_size, 14)}px`,
    "--nq-banner-button-hover-bg": asString(b.button_hover_bg_color, "#f2f7fb"),
    "--nq-banner-button-hover-color": asString(b.button_hover_text_color, "#0A0A0A"),
  } as React.CSSProperties;

  if (backgroundType === "solid") {
    style.background = backgroundColor;
  } else {
    style.background = `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`;
  }

  return style;
};

const contentAlignmentClass = (banner: HomepageBannerData) => {
  const horizontal = asString(banner.horizontal_align, banner.text_align as string);
  const vertical = asString(banner.vertical_align, "center");
  return `nq-align-x-${horizontal} nq-align-y-${vertical}`;
};

export const HomepageBanner: React.FC<HomepageBannerProps> = ({
  banner,
  mode,
  selectedElement,
  onSelectElement,
  editorPreview = false,
  className = "",
}) => {
  const b = normalizeBanner(banner);
  const desktopImageUrl = asString(b.image_url, "");
  const mobileImageUrl = asString(b.mobile_image_url, "");
  const activeImageUrl = mode === "mobile" && mobileImageUrl ? mobileImageUrl : desktopImageUrl;
  const backgroundImageUrl = asString(b.background_image_url, "");
  const layout = asString(b.layout, "overlay");
  const imagePosition = asString(b.image_position, "right");
  const isSplit = layout === "split-50" || layout === "image-left" || layout === "image-right";
  const isTextOnly = layout === "text-only";
  const imageFirst = layout === "image-left" || imagePosition === "left";
  const overlayHasForegroundImage = layout === "overlay" && imagePosition !== "center";
  const backgroundUsesImage =
    !isTextOnly &&
    (layout === "overlay" || layout === "image-background" || imagePosition === "center");
  const title = asString(b.title, "Welcome to Nexus Qadr");
  const subtitle = asString(b.subtitle, "Discover products directly from verified sellers");
  const ctaText = asString(b.cta_text, "");
  const ctaUrl = asString(b.cta_url, "#") || "#";
  const imageSize = asString(b.image_size, "medium");
  const textAlign = mode === "mobile"
    ? asString(b.mobile_text_align, asString(b.text_align, "left"))
    : asString(b.text_align, "left");
  const backgroundPosition = asString(b.background_position, "center");
  const backgroundSize = asString(b.background_size, "cover");
  const backgroundRepeat = asString(b.background_repeat, "no-repeat");
  const objectFit = asString(b.image_object_fit, "cover");
  const imageShadow = asBoolean(b.image_shadow, true);
  const hasAnimation = asString(b.animation, "none") !== "none";

  const select = (element: BannerElement) => (event: React.MouseEvent) => {
    if (!onSelectElement) return;
    event.preventDefault();
    event.stopPropagation();
    onSelectElement(element);
  };

  const imageNode = activeImageUrl ? (
    <button
      type="button"
      className={`nq-banner-image-shell nq-image-${imageSize}${imageShadow ? " has-shadow" : ""}${selectClass("image", selectedElement)}`}
      onClick={select("image")}
      aria-label="Select banner image"
      disabled={!onSelectElement}
    >
      <img
        src={activeImageUrl}
        alt={title}
        className="nq-banner-image"
        style={{ objectFit }}
        loading={editorPreview ? "eager" : "lazy"}
      />
    </button>
  ) : null;

  return (
    <section
      className={[
        "nq-home-banner",
        `nq-layout-${layout}`,
        mode ? `is-${mode}` : "",
        editorPreview ? "is-editor-preview" : "",
        hasAnimation ? "has-subtle-animation" : "",
        className,
      ].filter(Boolean).join(" ")}
      style={buildBannerStyle(b)}
      onClick={select("canvas")}
    >
      {backgroundImageUrl && (
        <div
          className="nq-banner-background-image"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundPosition,
            backgroundSize,
            backgroundRepeat,
          }}
        />
      )}

      {backgroundUsesImage && activeImageUrl && (
        <button
          type="button"
          className={`nq-banner-hero-image${selectClass("image", selectedElement)}`}
          onClick={select("image")}
          aria-label="Select banner background image"
          disabled={!onSelectElement}
        >
          <img src={activeImageUrl} alt={title} style={{ objectFit }} />
        </button>
      )}

      <div className="nq-banner-overlay" />

      <div className={`nq-banner-inner ${contentAlignmentClass(b)}`}>
        {isSplit && imageFirst && imageNode}
        {!isSplit && overlayHasForegroundImage && imageFirst && imageNode}

        <div className={`nq-banner-copy nq-text-${textAlign}`}>
          <button
            type="button"
            className={`nq-banner-title${selectClass("title", selectedElement)}`}
            onClick={select("title")}
            disabled={!onSelectElement}
          >
            {title}
          </button>

          <button
            type="button"
            className={`nq-banner-subtitle${selectClass("subtitle", selectedElement)}`}
            onClick={select("subtitle")}
            disabled={!onSelectElement}
          >
            {subtitle}
          </button>

          {ctaText && (
            <a
              href={editorPreview ? "#" : ctaUrl}
              className={`nq-banner-cta${selectClass("button", selectedElement)}`}
              onClick={select("button")}
            >
              {ctaText}
            </a>
          )}
        </div>

        {isSplit && !imageFirst && imageNode}
        {!isSplit && overlayHasForegroundImage && !imageFirst && imageNode}
        {!isSplit && !overlayHasForegroundImage && !backgroundUsesImage && imageNode}
      </div>
    </section>
  );
};

export default HomepageBanner;
