import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(process.cwd(), 'src', 'data');
const BANNER_FILE = path.join(DATA_DIR, 'banner.json');

export async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

export async function readBanner() {
  try {
    await ensureDataDir();
    const raw = await fs.readFile(BANNER_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    // return default banner
    return {
      title: 'Welcome to Nexus Qadr',
      subtitle: 'Discover products directly from verified sellers',
      gradientFrom: '#0D47A1',
      gradientTo: '#00B0FF',
      image_url: null,
      mobile_image_url: null,
      cta_text: null,
      cta_url: null,
      image_position: 'right',
      image_size: 'medium',
      overlay_opacity: 40,
      text_align: 'left',
      padding_large: true,
      rounded: true,
      layout: 'overlay',
      background_type: 'gradient',
      background_color: '#0D47A1',
      gradient_angle: 90,
      background_image_url: '',
      background_position: 'center',
      background_size: 'cover',
      background_repeat: 'no-repeat',
      text_color: '#ffffff',
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
      horizontal_align: 'left',
      vertical_align: 'center',
      mobile_text_align: 'center',
      image_width: 240,
      image_height: 180,
      mobile_image_width: 220,
      mobile_image_height: 140,
      image_object_fit: 'cover',
      image_radius: 16,
      image_shadow: true,
      overlay_enabled: true,
      overlay_color: '#000000',
      overlay_gradient_enabled: false,
      overlay_gradient_from: '#000000',
      overlay_gradient_to: '#0D47A1',
      overlay_gradient_angle: 90,
      button_bg_color: '#ffffff',
      button_text_color: '#0A0A0A',
      button_border_color: 'transparent',
      button_border_width: 0,
      button_radius: 999,
      button_padding_x: 18,
      button_padding_y: 10,
      button_font_size: 14,
      button_hover_bg_color: '#F2F7FB',
      button_hover_text_color: '#0A0A0A',
      banner_radius: 24,
      banner_shadow: false,
      banner_border_color: 'rgba(255,255,255,0.14)',
      banner_border_width: 0,
      banner_opacity: 100,
      animation: 'none',
      updated_at: new Date().toISOString(),
    };
  }
}

export async function writeBanner(banner) {
  await ensureDataDir();
  const payload = {
    ...banner,
    updated_at: new Date().toISOString(),
  };
  await fs.writeFile(BANNER_FILE, JSON.stringify(payload, null, 2), 'utf8');
  return payload;
}
