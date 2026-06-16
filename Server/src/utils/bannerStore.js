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
