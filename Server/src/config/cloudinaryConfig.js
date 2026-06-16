import { v2 as cloudinary } from "cloudinary";
import pkg from "multer-storage-cloudinary";

// Resolve CloudinaryStorage across different module shapes:
// - pkg.CloudinaryStorage (common when package exports an object)
// - pkg.default.CloudinaryStorage (when transpiled into default)
// - pkg.default (when default export is the constructor)
// - pkg (when require() returns the constructor directly)
const CloudinaryStorage = pkg?.CloudinaryStorage ?? pkg?.default?.CloudinaryStorage ?? pkg?.default ?? pkg;

if (!CloudinaryStorage) {
  throw new Error('CloudinaryStorage not found on multer-storage-cloudinary package');
}
import multer from "multer";

// ---------------- CLOUDINARY CONFIG ----------------
cloudinary.config({
  secure: true,
});

// ---------------- STORAGE ----------------
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    return {
      folder: "nexus_qadr_products",
      format: file.mimetype.split("/")[1], // jpg | png | webp
      // Do not force any crop/resize here. Keep transformations empty so uploaded
      // images are stored as-is by Cloudinary (only automatic format/quality can
      // be applied later on delivery). If you want optimization without cropping,
      // use `quality: 'auto'` or `fetch_format: 'auto'` on delivery URLs instead.
    };
  },
});

// ---------------- MULTER ----------------
export const uploadCloud = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }
    cb(null, true);
  },
});

// Export cloudinary instance for delete/update
export default cloudinary;
