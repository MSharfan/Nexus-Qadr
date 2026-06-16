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
    const payload = req.body;
    // basic validation
    const allowed = ['title', 'subtitle', 'gradientFrom', 'gradientTo', 'image_url'];
    const banner = {};
    for (const k of allowed) {
      if (payload[k] !== undefined) banner[k] = payload[k];
    }

    const saved = await writeBanner(banner);
    res.json({ message: 'Banner updated', banner: saved });
  } catch (err) {
    console.error('Update Banner Error:', err);
    res.status(500).json({ message: 'Failed to update banner' });
  }
};
