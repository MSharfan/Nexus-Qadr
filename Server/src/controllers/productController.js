// Server/src/controllers/productController.js
import pool from "../config/db.js";
import cloudinary from "../config/cloudinaryConfig.js";

const parseCloudinaryIds = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value !== "string") return [];
  const trimmed = value.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [trimmed];
};

const ensureProductShippingColumns = async () => {
  await pool.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS weight_kg numeric(10,3) DEFAULT 0.5,
      ADD COLUMN IF NOT EXISTS length_cm numeric(10,2) DEFAULT 10,
      ADD COLUMN IF NOT EXISTS width_cm numeric(10,2) DEFAULT 10,
      ADD COLUMN IF NOT EXISTS height_cm numeric(10,2) DEFAULT 5,
      ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0
  `);
  await pool.query(`
    ALTER TABLE product_sizes
      ADD COLUMN IF NOT EXISTS price numeric(10,2),
      ADD COLUMN IF NOT EXISTS discount_percent numeric(5,2) DEFAULT 0
  `);
};

const parsePositiveNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const parseDiscountPercent = (value) => {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n)) return 0;
  return Math.min(Math.max(n, 0), 95);
};

const normalizeList = (val) => {
  if (!val) return [];
  const arr = Array.isArray(val) ? val : String(val).split(",");
  return Array.from(new Set(arr.map((v) => String(v).trim()).filter(Boolean)));
};

const normalizeSizePrices = (sizePrices) => {
  if (!Array.isArray(sizePrices)) return [];
  return sizePrices
    .map((row) => ({
      size: String(row?.size ?? "").trim(),
      price: parsePositiveNumber(row?.price, 0),
      discount_percent: parseDiscountPercent(row?.discount_percent),
    }))
    .filter((row) => row.size && row.price > 0);
};

/* ============================================================
   ADD PRODUCT (Seller Only)
============================================================ */
export const addProduct = async (req, res) => {
  try {
    await ensureProductShippingColumns();

    const seller_id = req.user.id;
    const {
      title,
      description,
      price,
      stock,
      category_id,
      category_ids,
      image_url,
      public_id,
      extra_images,
      sizes,
      colors,
      discount_percent,
      size_prices,
      weight_kg,
      length_cm,
      width_cm,
      height_cm,
    } = req.body;

    if (
      !title ||
      price === undefined ||
      stock === undefined ||
      (!category_id && !Array.isArray(category_ids)) ||
      !image_url ||
      !public_id
    ) {
      return res.status(400).json({
        message: "All fields including image are required",
      });
    }

    if (Number(price) <= 0 || Number(stock) < 0) {
      return res.status(400).json({
        message: "Invalid price or stock",
      });
    }

    const categoryList = Array.isArray(category_ids)
      ? category_ids.map((c) => Number(c)).filter((c) => Number.isFinite(c))
      : category_id
        ? [Number(category_id)]
        : [];

    if (categoryList.length === 0) {
      return res.status(400).json({ message: "Invalid category" });
    }

    // Validate categories
    const catCheck = await pool.query(
      "SELECT id FROM categories WHERE id = ANY($1::int[])",
      [categoryList]
    );

    if (catCheck.rows.length !== categoryList.length) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const primaryCategoryId = categoryList[0];

    // Prepare cloudinary_id: store primary public_id plus any extra image public_ids as JSON string
    const cloudinaryIdsArray = [public_id];
    if (Array.isArray(extra_images)) {
      for (const it of extra_images) {
        if (it && it.public_id) cloudinaryIdsArray.push(it.public_id);
      }
    }

    const cloudinary_ids_string = JSON.stringify(cloudinaryIdsArray);

    const insertQ = await pool.query(
      `INSERT INTO products
        (title, description, price, stock, status, category_id, seller_id, image_url, cloudinary_id, weight_kg, length_cm, width_cm, height_cm, discount_percent, created_at)
       VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
       RETURNING *`,
      [
        title.trim(),
        description || "",
        price,
        stock,
        primaryCategoryId,
        seller_id,
        image_url,
        cloudinary_ids_string,
        parsePositiveNumber(weight_kg, 0.5),
        parsePositiveNumber(length_cm, 10),
        parsePositiveNumber(width_cm, 10),
        parsePositiveNumber(height_cm, 5),
        parseDiscountPercent(discount_percent),
      ]
    );

    const productId = insertQ.rows[0].id;

    const sizeList = normalizeList(sizes);
    const sizePriceList = normalizeSizePrices(size_prices);
    const colorList = normalizeList(colors);

    for (const size of sizeList) {
      const sizePrice = sizePriceList.find((row) => row.size.toLowerCase() === size.toLowerCase());
      await pool.query(
        `INSERT INTO product_sizes (product_id, size, price, discount_percent)
         VALUES ($1, $2, $3, $4)`,
        [productId, size, sizePrice?.price ?? null, sizePrice?.discount_percent ?? 0]
      );
    }
    for (const color of colorList) {
      await pool.query(
        "INSERT INTO product_colors (product_id, color) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [productId, color]
      );
    }

    for (const catId of categoryList) {
      await pool.query(
        "INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [productId, catId]
      );
    }

    res.status(201).json({
      message: "Product added successfully",
      product: insertQ.rows[0],
    });
  } catch (err) {
    console.error("Add Product Error:", err);
    res.status(500).json({
      message: "Failed to add product",
      error: err.message,
    });
  }
};

/* ============================================================
   UPDATE PRODUCT (Seller Only)
============================================================ */
export const updateProduct = async (req, res) => {
  try {
    await ensureProductShippingColumns();

    const seller_id = req.user.id;
    const product_id = req.params.id;

    const check = await pool.query(
      "SELECT * FROM products WHERE id = $1 AND seller_id = $2",
      [product_id, seller_id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "You cannot edit this product" });
    }

    const oldProduct = check.rows[0];

    const {
      title,
      description,
      price,
      stock,
      category_id,
      category_ids,
      image_url,
      public_id,
      extra_images,
      sizes,
      colors,
      discount_percent,
      size_prices,
      status,
      weight_kg,
      length_cm,
      width_cm,
      height_cm,
    } = req.body;

    const fields = [];
    const values = [];
    let i = 1;

    if (title) {
      fields.push(`title = $${i++}`);
      values.push(title.trim());
    }

    if (description !== undefined) {
      fields.push(`description = $${i++}`);
      values.push(description);
    }

    if (price !== undefined) {
      if (Number(price) <= 0) {
        return res.status(400).json({ message: "Invalid price" });
      }
      fields.push(`price = $${i++}`);
      values.push(price);
    }

    if (discount_percent !== undefined) {
      fields.push(`discount_percent = $${i++}`);
      values.push(parseDiscountPercent(discount_percent));
    }

    if (stock !== undefined) {
      if (Number(stock) < 0) {
        return res.status(400).json({ message: "Invalid stock" });
      }
      fields.push(`stock = $${i++}`);
      values.push(stock);
    }

    const packageFields = [
      ["weight_kg", weight_kg],
      ["length_cm", length_cm],
      ["width_cm", width_cm],
      ["height_cm", height_cm],
    ];

    for (const [field, value] of packageFields) {
      if (value !== undefined) {
        const n = Number(value);
        if (!Number.isFinite(n) || n <= 0) {
          return res.status(400).json({ message: "Invalid package weight or dimensions" });
        }
        fields.push(`${field} = $${i++}`);
        values.push(n);
      }
    }

    const categoryList = Array.isArray(category_ids)
      ? category_ids.map((c) => Number(c)).filter((c) => Number.isFinite(c))
      : category_id
        ? [Number(category_id)]
        : null;

    if (categoryList && categoryList.length > 0) {
      fields.push(`category_id = $${i++}`);
      values.push(categoryList[0]);
    }

    if (status) {
      const allowed = ["active", "inactive", "out_of_stock"];
      if (!allowed.includes(status)) {
        return res.status(400).json({ message: "Invalid product status" });
      }
      fields.push(`status = $${i++}`);
      values.push(status);
    }
    

    // Handle image replacement + extra images (cloudinary_id stores JSON array)
    const existingIds = parseCloudinaryIds(oldProduct.cloudinary_id);
    const existingMainId = existingIds[0];

    let nextMainId = existingMainId;
    if (image_url && public_id) {
      // Replace main image only (do not delete extras)
      if (existingMainId) {
        try {
          await cloudinary.uploader.destroy(existingMainId);
        } catch (err) {
          console.warn("Cloudinary delete failed:", existingMainId, err?.message || err);
        }
      }
      nextMainId = public_id;
      fields.push(`image_url = $${i++}`);
      values.push(image_url);
    }

    // If extra_images provided, replace extras list in cloudinary_id
    if (Array.isArray(extra_images)) {
      const extraIds = extra_images
        .map((it) => it?.public_id)
        .filter(Boolean);
      const nextIds = [nextMainId, ...extraIds].filter(Boolean);
      if (nextIds.length > 0) {
        fields.push(`cloudinary_id = $${i++}`);
        values.push(JSON.stringify(nextIds));
      }

      // Remove old extras from Cloudinary if they're being replaced
      const oldExtraIds = existingIds.slice(1);
      for (const oldId of oldExtraIds) {
        if (!extraIds.includes(oldId)) {
          try {
            await cloudinary.uploader.destroy(oldId);
          } catch (err) {
            console.warn("Cloudinary delete failed:", oldId, err?.message || err);
          }
        }
      }
    } else if (image_url && public_id) {
      // Only main changed, keep existing extras
      const nextIds = [nextMainId, ...existingIds.slice(1)].filter(Boolean);
      if (nextIds.length > 0) {
        fields.push(`cloudinary_id = $${i++}`);
        values.push(JSON.stringify(nextIds));
      }
    }

    const sizeList = sizes !== undefined ? normalizeList(sizes) : null;
    const sizePriceList = size_prices !== undefined ? normalizeSizePrices(size_prices) : [];
    const colorList = colors !== undefined ? normalizeList(colors) : null;

    if (fields.length > 0) {
      values.push(product_id);
      await pool.query(
        `UPDATE products SET ${fields.join(", ")}
         WHERE id = $${i}`,
        values
      );
    }

    if (sizeList !== null) {
      await pool.query("DELETE FROM product_sizes WHERE product_id = $1", [product_id]);
      for (const size of sizeList) {
        const sizePrice = sizePriceList.find((row) => row.size.toLowerCase() === size.toLowerCase());
        await pool.query(
          `INSERT INTO product_sizes (product_id, size, price, discount_percent)
           VALUES ($1, $2, $3, $4)`,
          [product_id, size, sizePrice?.price ?? null, sizePrice?.discount_percent ?? 0]
        );
      }
    }

    if (colorList !== null) {
      await pool.query("DELETE FROM product_colors WHERE product_id = $1", [product_id]);
      for (const color of colorList) {
        await pool.query(
          "INSERT INTO product_colors (product_id, color) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [product_id, color]
        );
      }
    }

    if (categoryList !== null) {
      await pool.query("DELETE FROM product_categories WHERE product_id = $1", [product_id]);
      for (const catId of categoryList) {
        await pool.query(
          "INSERT INTO product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [product_id, catId]
        );
      }
    }

    const updateQ = await pool.query(
      "SELECT * FROM products WHERE id = $1",
      [product_id]
    );

    res.json({
      message: "Product updated successfully",
      product: updateQ.rows[0],
    });
  } catch (err) {
    console.error("Update Product Error:", err);
    res.status(500).json({ message: "Failed to update product" });
  }
};

/* ============================================================
   UPDATE PRODUCT STATUS (Seller Only)
============================================================ */
export const updateProductStatus = async (req, res) => {
  try {
    const seller_id = req.user.id;
    const product_id = req.params.id;
    const { status } = req.body;

    const allowed = ["active", "inactive", "out_of_stock"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    const check = await pool.query(
      "SELECT id FROM products WHERE id = $1 AND seller_id = $2",
      [product_id, seller_id]
    );

    if (check.rows.length === 0) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const q = await pool.query(
      "UPDATE products SET status = $1 WHERE id = $2 RETURNING *",
      [status, product_id]
    );

    res.json({
      message: "Product status updated",
      product: q.rows[0],
    });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ message: "Failed to update product status" });
  }
};

/* ============================================================
   DELETE PRODUCT (Seller Only)
============================================================ */
export const deleteProduct = async (req, res) => {
  try {
    const seller_id = req.user.id;
    const product_id = req.params.id;

    const exists = await pool.query(
      "SELECT * FROM products WHERE id = $1 AND seller_id = $2",
      [product_id, seller_id]
    );

    if (exists.rows.length === 0) {
      return res.status(403).json({ message: "You cannot delete this product" });
    }

    const product = exists.rows[0];

    const ids = parseCloudinaryIds(product.cloudinary_id);
    for (const id of ids) {
      try {
        await cloudinary.uploader.destroy(id);
      } catch (err) {
        console.warn("Cloudinary delete failed:", id, err?.message || err);
      }
    }

    await pool.query("DELETE FROM products WHERE id = $1", [product_id]);

    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    console.error("Delete Product Error:", err);
    res.status(500).json({ message: "Failed to delete product" });
  }
};

/* ============================================================
   GET SELLER PRODUCTS
============================================================ */
export const getSellerProducts = async (req, res) => {
  try {
    await ensureProductShippingColumns();

    const seller_id = req.user.id;

    const q = await pool.query(
      `SELECT
         p.id,
         p.title,
         p.price,
         p.stock,
         p.status,
         p.image_url,
         p.created_at,
         c.name AS category_name,
         array_agg(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL) AS category_ids,
         array_agg(DISTINCT c2.name) FILTER (WHERE c2.name IS NOT NULL) AS category_names
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_categories pc ON pc.product_id = p.id
       LEFT JOIN categories c2 ON c2.id = pc.category_id
       WHERE p.seller_id = $1
       GROUP BY p.id, c.name
       ORDER BY p.created_at DESC`,
      [seller_id]
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get Seller Products Error:", err);
    res.status(500).json({ message: "Failed to fetch seller products" });
  }
};

/* ============================================================
   GET ALL PRODUCTS (PUBLIC)
============================================================ */
export const getAllProducts = async (req, res) => {
  try {
    await ensureProductShippingColumns();

    const { category, limit = 20, offset = 0 } = req.query;

    let whereClause = `WHERE p.status = 'active'`;
    const values = [];

    // Category filter (optional)
    if (category) {
      values.push(category);
      whereClause += ` AND p.category_id = $${values.length}`;
    }

    // Pagination
    values.push(limit);
    values.push(offset);

    // Ensure product_flags exists to surface is_trending flag
    await pool.query(
      `CREATE TABLE IF NOT EXISTS product_flags (
         product_id uuid PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
         is_trending boolean DEFAULT FALSE
       )`
    );

    const q = await pool.query(
      `SELECT
         p.*,
         COALESCE(pf.is_trending, FALSE) AS is_trending,
         c.name AS category_name,
         array_agg(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL) AS category_ids,
         array_agg(DISTINCT c2.name) FILTER (WHERE c2.name IS NOT NULL) AS category_names
       FROM products p
       LEFT JOIN product_flags pf ON pf.product_id = p.id
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_categories pc ON pc.product_id = p.id
       LEFT JOIN categories c2 ON c2.id = pc.category_id
       ${whereClause}
       GROUP BY p.id, pf.is_trending, c.name
       ORDER BY p.created_at DESC
       LIMIT $${values.length - 1}
       OFFSET $${values.length}`,
      values
    );

    res.json(q.rows);
  } catch (err) {
    console.error("Get All Products Error:", err);
    res.status(500).json({ message: "Failed to fetch products" });
  }
};

/* ============================================================
   GET PRODUCT BY ID (PUBLIC)
============================================================ */
export const getProductById = async (req, res) => {
  try {
    await ensureProductShippingColumns();

    const product_id = req.params.id;

    const q = await pool.query(
      `SELECT
         p.*,
         c.name AS category_name,
         array_agg(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL) AS category_ids,
         array_agg(DISTINCT c2.name) FILTER (WHERE c2.name IS NOT NULL) AS category_names
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN product_categories pc ON pc.product_id = p.id
       LEFT JOIN categories c2 ON c2.id = pc.category_id
       WHERE p.id = $1 AND p.status = 'active'
       GROUP BY p.id, c.name`
      , [product_id]
    );

    if (q.rows.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    const row = q.rows[0];
    const sizeQ = await pool.query(
      `SELECT
         size,
         price,
         discount_percent,
         COALESCE(price, $2::numeric) AS base_price,
         ROUND((COALESCE(price, $2::numeric) * (1 - COALESCE(NULLIF(discount_percent, 0), $3::numeric, 0) / 100.0))::numeric, 2) AS final_price
       FROM product_sizes
       WHERE product_id = $1
       ORDER BY size`,
      [product_id, Number(row.price ?? 0), parseDiscountPercent(row.discount_percent)]
    );
    const colorQ = await pool.query(
      "SELECT color FROM product_colors WHERE product_id = $1 ORDER BY color",
      [product_id]
    );
    const ids = parseCloudinaryIds(row.cloudinary_id);
    const extraIds = ids.slice(1);
    const extra_images = extraIds.map((id) => ({
      public_id: id,
      image_url: cloudinary.url(id, { secure: true }),
    }));

    res.json({
      ...row,
      extra_images,
      sizes: sizeQ.rows.map((r) => r.size),
      size_prices: sizeQ.rows,
      colors: colorQ.rows.map((r) => r.color),
    });
  } catch (err) {
    console.error("Get Product By ID Error:", err);
    res.status(500).json({ message: "Failed to fetch product" });
  }
};
