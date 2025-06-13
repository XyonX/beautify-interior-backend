// models/Product.js
import pool from "../../config/database.js";

const Product = {
  insertProduct: async (productData) => {
    const query = `
      INSERT INTO products (
        name,slug, description, short_description, sku, price, compare_at_price, 
        cost_price, track_quantity, quantity, weight, dimensions, status, 
        visibility, category_id,tags, seo_title, seo_description, 
        vendor, is_featured, is_new, on_sale
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *;
    `;

    const values = [
      productData.name,
      productData.slug,
      productData.description,
      productData.shortDescription,
      productData.sku,
      productData.price,
      productData.compareAtPrice,
      productData.costPrice,
      productData.trackQuantity,
      productData.quantity,
      productData.weight,
      productData.dimensions,
      productData.status,
      productData.visibility,
      productData.categoryId,
      productData.tags,
      productData.seo_title,
      productData.seo_description,
      productData.vendor,
      productData.is_featured,
      productData.is_new,
      productData.on_sale,
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
  },
  getProducts: async (options = {}) => {
    let query = `
      SELECT 
        id, name, slug, description, short_description AS "shortDescription", 
        sku, barcode, price, compare_at_price AS "compareAtPrice", 
        cost_price AS "costPrice", track_quantity AS "trackQuantity", 
        quantity, low_stock_threshold AS "lowStockThreshold", weight, 
        dimensions, status, visibility, category_id AS "categoryId", 
        tags, seo_title AS "seoTitle", seo_description AS "seoDescription", 
        vendor, is_featured AS "isFeatured", is_new AS "isNew", 
        on_sale AS "onSale", sales_count AS "salesCount", view_count AS "viewCount",
        average_rating AS "averageRating", review_count AS "reviewCount",
        created_at AS "createdAt", updated_at AS "updatedAt"
      FROM products
      WHERE 1=1
    `;

    const values = [];
    const conditions = [];
    const validSortFields = [
      "name",
      "price",
      "created_at",
      "updated_at",
      "quantity",
      "sales_count",
      "average_rating",
    ];
    const validSortOrders = ["ASC", "DESC"];

    // Apply filters
    if (options.categoryId) {
      conditions.push(`category_id = $${values.length + 1}`);
      values.push(options.categoryId);
    }

    if (options.status) {
      conditions.push(`status = $${values.length + 1}`);
      values.push(options.status);
    }

    if (options.visibility) {
      conditions.push(`visibility = $${values.length + 1}`);
      values.push(options.visibility);
    }

    if (options.isFeatured !== undefined) {
      conditions.push(`is_featured = $${values.length + 1}`);
      values.push(options.isFeatured);
    }

    if (options.isNew !== undefined) {
      conditions.push(`is_new = $${values.length + 1}`);
      values.push(options.isNew);
    }

    if (options.onSale !== undefined) {
      conditions.push(`on_sale = $${values.length + 1}`);
      values.push(options.onSale);
    }

    if (options.minQuantity !== undefined) {
      conditions.push(`quantity >= $${values.length + 1}`);
      values.push(options.minQuantity);
    }

    if (options.maxQuantity !== undefined) {
      conditions.push(`quantity <= $${values.length + 1}`);
      values.push(options.maxQuantity);
    }

    if (options.searchTerm) {
      const searchTerm = `%${options.searchTerm}%`;
      conditions.push(`
        (name ILIKE $${values.length + 1} OR 
        description ILIKE $${values.length + 1} OR 
        tags::text ILIKE $${values.length + 1})
      `);
      values.push(searchTerm);
    }

    // Add conditions to query
    if (conditions.length > 0) {
      query += ` AND ${conditions.join(" AND ")}`;
    }

    // Apply sorting
    if (options.sortBy) {
      const sortField = validSortFields.includes(options.sortBy)
        ? options.sortBy
        : "created_at";

      const sortOrder = validSortOrders.includes(
        options.sortOrder?.toUpperCase()
      )
        ? options.sortOrder.toUpperCase()
        : "DESC";

      query += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    // Apply pagination
    const page = options.page > 0 ? options.page : 1;
    const limit = options.limit > 0 ? options.limit : 10;
    const offset = (page - 1) * limit;

    query += `
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;
    values.push(limit, offset);

    // Execute product query
    const { rows: products } = await pool.query(query, values);

    // If no products found, return empty array
    if (products.length === 0) return [];

    // Get product IDs for image query
    const productIds = products.map((p) => p.id);

    // Fetch images for these products
    const imageQuery = `
    SELECT 
      product_id AS "productId", 
      url, 
      alt_text AS "altText",
      is_main AS "isMain",
      sort_order AS "sortOrder"
    FROM product_images
    WHERE product_id = ANY($1)
    ORDER BY product_id, is_main DESC, sort_order ASC
  `;
    const { rows: images } = await pool.query(imageQuery, [productIds]);

    // Group images by product ID
    const imagesByProduct = images.reduce((acc, image) => {
      if (!acc[image.productId]) {
        acc[image.productId] = [];
      }
      acc[image.productId].push(image);
      return acc;
    }, {});

    // Attach images to products
    return products.map((product) => {
      const productImages = imagesByProduct[product.id] || [];

      console.log("product images:  ", productImages);

      // Find thumbnail (main image)
      const thumbnail = productImages.find((img) => img.isMain)?.url || null;

      // Get detailed images (non-main, max 5)
      const detailedImages = productImages
        .filter((img) => !img.is_main)
        .slice(0, 5)
        .map((img) => img.url);

      console.log("Detailed iimages ", detailedImages);
      return {
        ...product,
        thumbnail,
        detailedImages,
      };
    });
  },
  slugExists: async (slug) => {
    const query = "SELECT 1 FROM categories WHERE slug = $1 LIMIT 1";
    const { rows } = await pool.query(query, [slug]);
    return rows.length > 0;
  },
  findProductById: async (id) => {
    // First query: Fetch product with category
    const query = `
      SELECT (row_to_json(p)::jsonb - 'category_id') || jsonb_build_object('category', row_to_json(c)) AS product_with_category
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1;
    `;

    const { rows } = await pool.query(query, [id]);
    if (rows.length === 0) {
      throw new Error("Product not found");
    }
    const product = rows[0]; // { product_with_category: { id, name, category, ... } }
    const productData = product.product_with_category; // { id, name, category, ... }
    const productId = productData.id; // The product ID

    // Second query: Fetch product images
    const query1 = `
      SELECT * FROM product_images WHERE product_id = $1;
    `;
    const { rows: images } = await pool.query(query1, [productId]);

    // Process images
    const thumbnail = images.filter((image) => image.is_main); // Array of main images
    const detailedImages = images; // All images

    // Construct the return object
    return {
      ...productData,
      thumbnail: thumbnail[0],
      detailedImages,
    };
  },
};

export default Product;
