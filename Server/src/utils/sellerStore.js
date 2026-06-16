import fs from 'fs';
import path from 'path';

const dataDir = path.resolve(process.cwd(), 'src', 'data', 'seller_docs');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

export function readSellerDocs(userId) {
  const file = path.join(dataDir, `${userId}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('readSellerDocs error', e);
    return null;
  }
}

export function writeSellerDocs(userId, obj) {
  const file = path.join(dataDir, `${userId}.json`);
  try {
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeSellerDocs error', e);
    return false;
  }
}
