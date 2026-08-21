import { readBanner, writeBanner } from '../utils/bannerStore.js';

export const getBanner = async (req, res) => {
  try {
    const b = await readBanner();
    res.json(b);
  } catch (err) {
    console.error('Get Banner Error:', err);
    res.status(500).json({ message: 'Failed to read banner' });
  }
};

export const updateBanner = async (req, res) => {
  try {
    const payload = req.body || {};

    const banner = {
      ...payload,
      show_banner: payload.show_banner ?? payload.is_enabled ?? payload.enabled ?? true,
      is_enabled: payload.is_enabled ?? payload.show_banner ?? payload.enabled ?? true,
      title: payload.title ?? null,
      subtitle: payload.subtitle ?? null,
      gradientFrom: payload.gradientFrom ?? payload.gradient_from ?? null,
      gradientTo: payload.gradientTo ?? payload.gradient_to ?? null,
      image_url: payload.image_url ?? payload.imageUrl ?? null,
      mobile_image_url: payload.mobile_image_url ?? payload.mobileImageUrl ?? null,
      cta_text: payload.cta_text ?? payload.ctaText ?? null,
      cta_url: payload.cta_url ?? payload.ctaUrl ?? null,
      image_position: payload.image_position ?? payload.imagePosition ?? null,
      image_size: payload.image_size ?? payload.imageSize ?? null,
      overlay_opacity: payload.overlay_opacity ?? payload.overlayOpacity ?? 40,
      text_align: payload.text_align ?? payload.textAlign ?? null,
      padding_large: payload.padding_large ?? payload.paddingLarge ?? true,
      rounded: payload.rounded ?? true,
      layout: payload.layout ?? "overlay",
    };

    const saved = await writeBanner(banner);
    res.json({ message: 'Banner updated', banner: saved });
  } catch (err) {
    console.error('Update Banner Error:', err);
    res.status(500).json({ message: 'Failed to update banner' });
  }
};
