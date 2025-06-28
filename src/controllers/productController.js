import productService from "../services/productService.js";
import imageService from "../services/imageService.js";
import Product from "../models/productModel.js";
import pool from "../../config/database.js";
import { Op } from "sequelize";

// export const createProduct = async (req, res) => {
//   const requiredFields = [
//     "name",
//     "description",
//     "sku",
//     "price",
//     "categoryId",
//     "thumbnail",
//   ];
//   console.log("Received data in backend: ", req.body);

//   const missingFields = requiredFields.filter((field) => !req.body[field]);

//   if (missingFields.length > 0) {
//     return res.status(400).json({
//       error: `Missing required fields: ${missingFields.join(", ")}`,
//     });
//   }

//   try {
//     const newProduct = await productService.createProduct(req.body);
//     await imageService.createImages(newProduct, req.productImages);

//     res.status(201).json(newProduct);
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// };

export const createProduct = async (req, res) => {
  console.log("Received data in backend: ", req.body);
  console.log("Files received: ", req.files);
  console.log("Product images: ", req.productImages);

  try {
    // Parse the product data from JSON string
    let productData;
    if (req.body.productData) {
      try {
        productData = JSON.parse(req.body.productData);
        console.log("Parsed product data:", productData);
      } catch (error) {
        console.error("Error parsing productData:", error);
        return res.status(400).json({ error: "Invalid product data format" });
      }
    } else {
      // Fallback to direct body parsing for backward compatibility
      productData = req.body;
    }

    const requiredFields = [
      "name",
      "description",
      "sku",
      "price",
      "categoryId",
    ];

    const missingFields = requiredFields.filter((field) => !productData[field]);

    if (missingFields.length > 0) {
      return res.status(400).json({
        error: `Missing required fields: ${missingFields.join(", ")}`,
      });
    }

    // Check if images were uploaded (handled by middleware)
    if (!req.body.thumbnail) {
      return res.status(400).json({ error: "Thumbnail is required" });
    }

    if (!req.productImages || req.productImages.length === 0) {
      return res
        .status(400)
        .json({ error: "At least one detailed image is required" });
    }

    // Create the product with the parsed data
    const newProduct = await productService.createProduct(productData);

    // Handle image uploads (already processed by middleware)
    await imageService.createImages(newProduct, req.productImages);

    res.status(201).json(newProduct);
  } catch (error) {
    console.error("Error creating product:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getProducts = async (req, res) => {
  // Always use req.query for GET parameters
  const { categoryId, sortBy, sortOrder, page, limit } = req.query;
  const options = {};

  // Validate and add parameters to options
  if (categoryId) {
    options.categoryId = categoryId;
  }

  if (sortBy) {
    options.sortBy = sortBy;
  }

  if (sortOrder) {
    // Validate sortOrder value
    if (["asc", "desc"].includes(sortOrder.toLowerCase())) {
      options.sortOrder = sortOrder.toLowerCase();
    } else {
      return res
        .status(400)
        .json({ error: "Invalid sortOrder. Use 'asc' or 'desc'" });
    }
  }

  if (page) {
    // Convert to number and validate
    const pageNum = parseInt(page, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({ error: "Invalid page number" });
    }
    options.page = pageNum;
  }

  if (limit) {
    // Convert to number and validate
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: "Limit must be between 1-100" });
    }
    options.limit = limitNum;
  }

  try {
    const products = await Product.getProducts(options);
    res.status(200).json(products);
  } catch (error) {
    console.error("Fetch products error:", error);
    res.status(500).json({
      error: "Failed to fetch products: " + error.message,
    });
  }
};
export const getProductById = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findProductById(id);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.status(200).json(product);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Failed to fetch product :" + error.message });
  }
};

export const updateProduct = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  console.log("📥 Received request to update product");
  console.log("🔍 Product ID:", id);
  console.log("📦 Update payload:", updates);

  // Basic validation
  if (!id || Object.keys(updates).length === 0) {
    console.warn("⚠️ Missing product ID or no update fields provided.");
    console.log("❌ Update aborted due to invalid input.");
    return res.status(400).json({ error: "Missing ID or no fields provided" });
  }

  // Define the allowed fields
  const allowedFields = [
    "name",
    "description",
    "short_Description",
    "price",
    "compare_at_price",
    "quantity",
    "weight",
    "dimensions",
    "status",
    "visibility",
    "category_id",
    "tags",
    "seo_title",
    "seo_description",
    "vendor",
    "is_featured",
    "is_new",
    "on_sale",
    "sales_count",
    "view_count",
    "average_rating",
    "review_count",
  ];

  // Filter valid update fields
  const fieldsToUpdate = Object.keys(updates).filter((field) =>
    allowedFields.includes(field)
  );

  console.log("✅ Valid fields to update:", fieldsToUpdate);

  if (fieldsToUpdate.length === 0) {
    console.warn("⚠️ No valid fields in request body.");
    console.log("❌ Update aborted due to no valid fields.");
    return res.status(400).json({ error: "No valid fields to update." });
  }

  // Build the SET clause dynamically
  const setClauses = fieldsToUpdate
    .map((field, index) => `${field} = $${index + 1}`)
    .join(", ");
  const values = fieldsToUpdate.map((field) => updates[field]); // fixed variable name

  const query = `
    UPDATE products
    SET ${setClauses}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${fieldsToUpdate.length + 1}
    RETURNING *;
  `;

  try {
    const { rows, rowCount } = await pool.query(query, [...values, id]);

    if (rowCount === 0) {
      console.warn("❌ No product found with the provided ID.");
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("✅ Product update successful. Updated data:", rows[0]);
    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error("🔥 Error while updating product:", error);

    if (error.code === "23505") {
      console.log("❌ Duplicate slug or SKU detected.");
      return res.status(409).json({ error: "Slug or SKU already exists" });
    }

    return res.status(500).json({ error: "Internal server error" });
  } finally {
    console.log("🔚 Finished processing update product request for ID:", id);
  }
};

export const getSimilarProducts = async (req, res) => {
  const { id } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  console.log("📥 Received request to get similar products");
  console.log("🔍 Target Product ID:", id);
  console.log("📊 Similar products limit:", limit);

  try {
    // 1. Fetch target product
    const productResult = await pool.query(
      `SELECT * FROM products WHERE id = $1`,
      [id]
    );
    const product = productResult.rows[0];

    if (!product) {
      console.warn(`⚠️ Product with ID ${id} not found.`);
      return res.status(404).json({ error: "Product not found" });
    }

    console.log("✅ Fetched product:", {
      id: product.id,
      category_id: product.category_id,
      tags: product.tags,
    });

    const originalTags = product.tags || [];
    const categoryId = product.category_id;

    // 2. Fetch similar products
    const similarQuery = `
      SELECT * 
      FROM products 
      WHERE 
        category_id = $1 
        AND id != $2
        AND status = 'active' 
        AND visibility = 'visible'
    `;
    const similarResult = await pool.query(similarQuery, [categoryId, id]);
    const similarProducts = similarResult.rows;

    console.log(
      `🔎 Found ${similarProducts.length} potential similar products in category.`
    );

    if (similarProducts.length === 0) {
      console.log("ℹ️ No similar products found in the same category");
      return res.status(200).json([]);
    }

    // 3. Score and sort by similarity
    const scoredProducts = similarProducts.map((p) => {
      const commonTags = p.tags
        ? p.tags.filter((tag) => originalTags.includes(tag)).length
        : 0;
      return { product: p, similarity: commonTags };
    });

    scoredProducts.sort(
      (a, b) =>
        b.similarity - a.similarity || a.product.id.localeCompare(b.product.id)
    );

    // 4. Apply limit and get product IDs
    const topProducts = scoredProducts.slice(0, limit).map((sp) => sp.product);

    const productIds = topProducts.map((p) => p.id);

    // 5. Fetch product images
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
    const imageResult = await pool.query(imageQuery, [productIds]);
    const images = imageResult.rows;

    // 6. Group images by product ID
    const imagesByProduct = images.reduce((acc, img) => {
      acc[img.productId] = acc[img.productId] || [];
      acc[img.productId].push(img);
      return acc;
    }, {});

    // 7. Prepare final response objects
    const finalProducts = topProducts.map((product) => {
      const productImages = imagesByProduct[product.id] || [];

      // Find thumbnail (main image)
      const thumbnail = productImages.find((img) => img.isMain)?.url || null;

      // Get detailed images (non-main, max 5)
      const detailedImages = productImages
        .filter((img) => !img.isMain)
        .slice(0, 5)
        .map((img) => img.url);

      return {
        ...product,
        thumbnail,
        detailedImages,
      };
    });

    // 8. Send final response
    console.log("✅ Returning", finalProducts.length, "similar products");
    console.log(finalProducts);
    res.status(200).json(finalProducts);
  } catch (error) {
    console.error("❌ Error fetching similar products:", error);

    if (error.code === "22P02") {
      console.error("🛑 Invalid input syntax error");
      return res.status(400).json({ error: "Invalid input parameters" });
    }

    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  } finally {
    console.log("🔚 Finished processing similar products request for ID:", id);
  }
};
