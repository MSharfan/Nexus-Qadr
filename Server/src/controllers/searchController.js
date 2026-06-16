import pool from "../config/db.js";

const STOP_WORDS = new Set(["for", "and", "or", "the", "a", "an", "to", "in", "on"]);

const SYNONYM_GROUPS = [
  ["men", "mens", "man", "male", "boy", "boys", "gents"],
  ["women", "womens", "woman", "female", "girl", "girls", "ladies"],
  ["footwear", "footware", "sandal", "sandals", "sandle", "sandles", "shoe", "shoes", "boot", "boots", "sneaker", "sneakers", "slipper", "slippers", "loafer", "loafers", "slide", "slides", "chelsea"],
  ["watch", "watches", "smartwatch", "smartwatches"],
  ["earphone", "earphones", "earbud", "earbuds", "airpod", "airpods", "headphone", "headphones"],
  ["pant", "pants", "trouser", "trousers", "trackpant", "trackpants", "jogger", "joggers"],
  ["hoodie", "hoodies", "sweatshirt", "sweatshirts"],
];

const TOKEN_ALIAS = new Map(
  SYNONYM_GROUPS.flatMap((group) => group.map((token) => [token, group]))
);

const normalizeQuery = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenize = (value) =>
  normalizeQuery(value)
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token && !STOP_WORDS.has(token));

const unique = (items) => Array.from(new Set(items.filter(Boolean)));

const expandTokens = (tokens) => {
  const expanded = [];
  for (const token of tokens) {
    expanded.push(...(TOKEN_ALIAS.get(token) ?? [token]));
  }
  return unique(expanded);
};

const buildSearchDocumentSql = () => `
  lower(concat_ws(' ',
    p.title,
    p.description,
    c.name,
    string_agg(DISTINCT c2.name, ' '),
    string_agg(DISTINCT ps.size, ' '),
    string_agg(DISTINCT pcx.color, ' ')
  ))
`;

const buildSearchVectorSql = (documentSql) => `
  setweight(to_tsvector('english', coalesce(p.title, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(c.name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(string_agg(DISTINCT c2.name, ' '), '')), 'A') ||
  setweight(to_tsvector('english', coalesce(p.description, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(string_agg(DISTINCT ps.size, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(string_agg(DISTINCT pcx.color, ' '), '')), 'C') ||
  setweight(to_tsvector('english', coalesce(${documentSql}, '')), 'D')
`;

const buildSearchTerms = (rawQuery) => {
  const tokens = tokenize(rawQuery);
  const expanded = expandTokens(tokens);
  const hasGenderIntent = expanded.some((token) =>
    ["men", "mens", "man", "male", "boy", "boys", "gents", "women", "womens", "woman", "female", "girl", "girls", "ladies"].includes(token)
  );
  const hasFootwearIntent = expanded.some((token) =>
    ["footwear", "footware", "sandal", "sandals", "sandle", "sandles", "shoe", "shoes", "boot", "boots", "sneaker", "sneakers", "slipper", "slippers", "loafer", "loafers", "slide", "slides", "chelsea"].includes(token)
  );

  return {
    tokens,
    expanded,
    hasIntent: tokens.length > 0,
    requiresGender: hasGenderIntent,
    requiresFootwear: hasGenderIntent && hasFootwearIntent,
    tsQueryText: expanded.join(" OR "),
  };
};

const addTokenFilters = ({ terms, values, havingParts, documentSql }) => {
  if (!terms.hasIntent) return;

  const genderTokens = terms.expanded.filter((token) =>
    ["men", "mens", "man", "male", "boy", "boys", "gents", "women", "womens", "woman", "female", "girl", "girls", "ladies"].includes(token)
  );
  const footwearTokens = terms.expanded.filter((token) =>
    ["footwear", "footware", "sandal", "sandals", "sandle", "sandles", "shoe", "shoes", "boot", "boots", "sneaker", "sneakers", "slipper", "slippers", "loafer", "loafers", "slide", "slides", "chelsea"].includes(token)
  );

  if (terms.requiresGender && genderTokens.length > 0) {
    const wantsWomen = genderTokens.some((token) =>
      ["women", "womens", "woman", "female", "girl", "girls", "ladies"].includes(token)
    );
    const genderRegex = wantsWomen
      ? "(^|[^a-z0-9])(women'?s?|woman|female|girls?|ladies)([^a-z0-9]|$)"
      : "(^|[^a-z0-9])(men'?s?|man|male|boys?|gents)([^a-z0-9]|$)";
    values.push(genderRegex);
    havingParts.push(`${documentSql} ~* $${values.length}`);
  }

  if (terms.requiresFootwear && footwearTokens.length > 0) {
    values.push(footwearTokens.map((token) => `%${token}%`));
    havingParts.push(`EXISTS (SELECT 1 FROM unnest($${values.length}::text[]) term WHERE ${documentSql} ILIKE term)`);
  }
};

// GET /search?q=&category=&trending=&limit=&offset=
export const searchProducts = async (req, res) => {
  try {
    const { q = "", category, trending } = req.query;
    const limit = Math.min(Math.max(Number(req.query.limit) || 24, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);

    const values = [];
    let where = `WHERE p.status = 'active'`;

    if (category && category !== "all") {
      values.push(category);
      where += ` AND (p.category_id = $${values.length} OR EXISTS (
        SELECT 1 FROM product_categories pc2
        WHERE pc2.product_id = p.id AND pc2.category_id = $${values.length}
      ))`;
    }

    if (trending === "true") {
      where += ` AND COALESCE(pf.is_trending, FALSE) = TRUE`;
    }

    const terms = buildSearchTerms(q);
    const documentSql = buildSearchDocumentSql();
    const searchVector = buildSearchVectorSql(documentSql);
    const havingParts = [];
    let queryIdx = null;
    let expandedIdx = null;
    let expandedPatternsIdx = null;

    if (terms.hasIntent) {
      values.push(q);
      queryIdx = values.length;
      values.push(terms.tsQueryText);
      expandedIdx = values.length;
      values.push(terms.expanded.map((term) => `%${term}%`));
      expandedPatternsIdx = values.length;

      havingParts.push(`(
        (${searchVector}) @@ websearch_to_tsquery('english', $${expandedIdx})
        OR ${documentSql} ILIKE '%' || lower($${queryIdx}) || '%'
        OR ${documentSql} ILIKE ANY($${expandedPatternsIdx}::text[])
        OR word_similarity(lower($${queryIdx}), ${documentSql}) > 0.18
      )`);

      addTokenFilters({ terms, values, havingParts, documentSql });
    }

    values.push(limit);
    const limitIdx = values.length;
    values.push(offset);
    const offsetIdx = values.length;

    const having = havingParts.length > 0 ? `HAVING ${havingParts.join(" AND ")}` : "";
    const rankSql = terms.hasIntent
      ? `
        ts_rank_cd((${searchVector}), websearch_to_tsquery('english', $${expandedIdx})) * 8
        + CASE WHEN ${documentSql} ILIKE lower($${queryIdx}) || '%' THEN 5 ELSE 0 END
        + CASE WHEN ${documentSql} ILIKE '%' || lower($${queryIdx}) || '%' THEN 3 ELSE 0 END
        + word_similarity(lower($${queryIdx}), ${documentSql}) * 2
        + CASE WHEN COALESCE(pf.is_trending, FALSE) THEN 0.75 ELSE 0 END
        + LEAST(EXTRACT(EPOCH FROM (NOW() - p.created_at)) / -604800.0, 0) * 0.01
      `
      : `CASE WHEN COALESCE(pf.is_trending, FALSE) THEN 1 ELSE 0 END`;

    const sql = `
      SELECT
        p.*,
        COALESCE(pf.is_trending, FALSE) AS is_trending,
        c.name AS category_name,
        array_agg(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL) AS category_ids,
        array_agg(DISTINCT c2.name) FILTER (WHERE c2.name IS NOT NULL) AS category_names,
        ${rankSql} AS rank
      FROM products p
      LEFT JOIN product_flags pf ON pf.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_categories pc ON pc.product_id = p.id
      LEFT JOIN categories c2 ON c2.id = pc.category_id
      LEFT JOIN product_sizes ps ON ps.product_id = p.id
      LEFT JOIN product_colors pcx ON pcx.product_id = p.id
      ${where}
      GROUP BY p.id, pf.is_trending, c.name
      ${having}
      ORDER BY rank DESC, p.created_at DESC
      LIMIT $${limitIdx}
      OFFSET $${offsetIdx}
    `;

    const result = await pool.query(sql, values);
    res.json({ products: result.rows });
  } catch (err) {
    console.error("Search Error:", err);
    res.status(500).json({ message: "Search failed", error: err.message });
  }
};

/**
 * AUTOCOMPLETE
 * GET /search/suggest?q=lap
 */
export const autocomplete = async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);
    if (!q) return res.json([]);

    const terms = buildSearchTerms(q);
    const expanded = terms.expanded.length > 0 ? terms.expanded : tokenize(q);
    const values = [q, expanded.join(" OR "), expanded.map((term) => `%${term}%`)];
    const filters = [];

    if (terms.requiresGender) {
      const wantsWomen = expanded.some((token) =>
        ["women", "womens", "woman", "female", "girl", "girls", "ladies"].includes(token)
      );
      values.push(
        wantsWomen
          ? "(^|[^a-z0-9])(women'?s?|woman|female|girls?|ladies)([^a-z0-9]|$)"
          : "(^|[^a-z0-9])(men'?s?|man|male|boys?|gents)([^a-z0-9]|$)"
      );
      filters.push(`doc ~* $${values.length}`);
    }

    if (terms.requiresFootwear) {
      const footwearPatterns = expanded
        .filter((token) =>
          ["footwear", "footware", "sandal", "sandals", "sandle", "sandles", "shoe", "shoes", "boot", "boots", "sneaker", "sneakers", "slipper", "slippers", "loafer", "loafers", "slide", "slides", "chelsea"].includes(token)
        )
        .map((token) => `%${token}%`);
      values.push(footwearPatterns);
      filters.push(`doc ILIKE ANY($${values.length}::text[])`);
    }

    values.push(limit);
    const limitIdx = values.length;

    const sql = `
      WITH docs AS (
        SELECT
          p.id,
          p.title,
          p.image_url,
          lower(concat_ws(' ', p.title, p.description, c.name, string_agg(DISTINCT c2.name, ' '))) AS doc,
          setweight(to_tsvector('english', coalesce(p.title, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(c.name, '')), 'A') ||
          setweight(to_tsvector('english', coalesce(string_agg(DISTINCT c2.name, ' '), '')), 'A') ||
          setweight(to_tsvector('english', coalesce(p.description, '')), 'B') AS search_vector
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN product_categories pc ON pc.product_id = p.id
        LEFT JOIN categories c2 ON c2.id = pc.category_id
        WHERE p.status = 'active'
        GROUP BY p.id, c.name
      )
      SELECT id, title, image_url
      FROM docs
      WHERE
        (
          search_vector @@ websearch_to_tsquery('english', $2)
          OR doc ILIKE '%' || lower($1) || '%'
          OR doc ILIKE ANY($3::text[])
          OR word_similarity(lower($1), doc) > 0.18
        )
        ${filters.length > 0 ? `AND ${filters.join(" AND ")}` : ""}
      ORDER BY
        CASE WHEN lower(title) ILIKE lower($1) || '%' THEN 0 ELSE 1 END,
        ts_rank_cd(search_vector, websearch_to_tsquery('english', $2)) DESC,
        word_similarity(lower($1), doc) DESC,
        title ASC
      LIMIT $${limitIdx}
    `;

    const { rows } = await pool.query(sql, values);
    res.json(rows);
  } catch (err) {
    console.error("Autocomplete Error:", err);
    res.status(500).json({ error: "Autocomplete failed" });
  }
};

// backward compatible alias
export const suggest = autocomplete;
