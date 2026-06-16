#!/usr/bin/env node

/**
 * migrate_seller_docs_to_cloudinary.js
 * Reads JSON files under src/data/seller_docs/*.json. For any values that are data URLs
 * (base64 images or PDFs), uploads them to Cloudinary and replaces the value with an
 * object { url, public_id, resource_type }.
 *
 * Usage:
 *   NODE_ENV=production node scripts/migrate_seller_docs_to_cloudinary.js
 *
 * Requires CLOUDINARY_URL or cloudinary config available via src/config/cloudinaryConfig.js
 */

import fs from 'fs';
import path from 'path';
import cloudinary from '../src/config/cloudinaryConfig.js';

const dataDir = path.resolve(process.cwd(), 'src', 'data', 'seller_docs');
if (!fs.existsSync(dataDir)) {
  console.error('No seller_docs directory found at', dataDir);
  process.exit(1);
}

function isDataUrl(v) {
  return typeof v === 'string' && v.startsWith('data:');
}

function parseDataUrl(dataUrl) {
  // data:[<mediatype>][;base64],<data>
  const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/);
  if (!match) return null;
  return { mime: match[1], base64: match[2] };
}

async function uploadBuffer(buffer, mime, folder = 'nexus_qadr_seller_docs') {
  const resource_type = mime === 'application/pdf' ? 'raw' : 'image';
  const uploadOptions = {
    folder,
    resource_type,
    use_filename: true,
    unique_filename: true,
    overwrite: false,
  };

  const res = await cloudinary.uploader.upload(`data:${mime};base64,${buffer.toString('base64')}`, uploadOptions);
  return res; // contains url, secure_url, public_id, resource_type, etc.
}

(async () => {
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    console.log('Processing', filePath);
    let raw;
    try {
      raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      console.error('Failed to parse', filePath, e);
      continue;
    }

    let modified = false;

    async function walk(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (typeof v === 'string' && isDataUrl(v)) {
          const parsed = parseDataUrl(v);
          if (!parsed) continue;
          const buf = Buffer.from(parsed.base64, 'base64');
          console.log(`  Uploading ${k} (${parsed.mime})...`);
          try {
            const res = await uploadBuffer(buf, parsed.mime);
            obj[k] = { url: res.secure_url || res.url, public_id: res.public_id, resource_type: res.resource_type };
            modified = true;
            console.log('    ->', obj[k].url);
          } catch (err) {
            console.error('Upload failed for', k, err);
          }
        } else if (Array.isArray(v)) {
          for (let i = 0; i < v.length; i++) {
            if (typeof v[i] === 'string' && isDataUrl(v[i])) {
              const parsed = parseDataUrl(v[i]);
              if (!parsed) continue;
              const buf = Buffer.from(parsed.base64, 'base64');
              console.log(`  Uploading ${k}[${i}] (${parsed.mime})...`);
              try {
                const res = await uploadBuffer(buf, parsed.mime);
                v[i] = { url: res.secure_url || res.url, public_id: res.public_id, resource_type: res.resource_type };
                modified = true;
                console.log('    ->', v[i].url);
              } catch (err) {
                console.error('Upload failed for', k, i, err);
              }
            } else if (typeof v[i] === 'object') {
              await walk(v[i]);
            }
          }
        } else if (typeof v === 'object') {
          await walk(v);
        }
      }
    }

    await walk(raw);

    if (modified) {
      fs.writeFileSync(filePath, JSON.stringify(raw, null, 2), 'utf8');
      console.log('Updated', filePath);
    } else {
      console.log('No changes for', filePath);
    }
  }

  console.log('Done.');
  process.exit(0);
})();
