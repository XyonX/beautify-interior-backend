// services/productService.js
import Product from "../models/productModel.js";
import slugify from "slugify";
const generateUniqueSlug = async (productData) => {
  // Create base slug from product name
  let baseSlug = slugify(productData.name, {
    lower: true,
    strict: true,
    trim: true,
  });

  // Add vendor/brand for better SEO (if available)
  if (productData.vendor) {
    const vendorSlug = slugify(productData.vendor, {
      lower: true,
      strict: true,
    });
    baseSlug = `${vendorSlug}-${baseSlug}`;
  }

  // Add key attributes (size/color for better uniqueness)
  const attributeSlug = [];
  if (productData.attributes && Array.isArray(productData.attributes)) {
    // Handle new attributes format (array of objects)
    for (const attr of productData.attributes) {
      if (
        attr.name &&
        attr.value &&
        ["color", "size", "material"].includes(attr.name.toLowerCase())
      ) {
        attributeSlug.push(slugify(attr.value, { lower: true, strict: true }));
      }
    }
  } else if (
    productData.attributes &&
    typeof productData.attributes === "object"
  ) {
    // Handle old attributes format (key-value object) for backward compatibility
    for (const [key, value] of Object.entries(productData.attributes)) {
      if (["color", "size", "material"].includes(key)) {
        attributeSlug.push(slugify(value, { lower: true, strict: true }));
      }
    }
  }

  // Limit total slug length to 80 chars for SEO
  let fullSlug = baseSlug;
  if (attributeSlug.length > 0) {
    const attributesString = attributeSlug.join("-");
    const maxLength = 80 - attributesString.length - 1;
    fullSlug = `${baseSlug.substring(0, maxLength)}-${attributesString}`;
  }

  // Ensure uniqueness
  let slug = fullSlug;
  let counter = 1;

  while (await Product.slugExists(slug)) {
    slug = `${fullSlug}-${counter}`;
    counter++;
  }

  return slug;
};
const toNumeric = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  return Number(value);
};
export default {
  createProduct: async (productData) => {
    const uniqueSlug = await generateUniqueSlug(productData);
    // Set default values for optional fields
    const product = {
      name: productData.name,
      slug: uniqueSlug, // Use the generated unique slug
      description: productData.description,
      shortDescription: productData.shortDescription || "",
      sku: productData.sku,
      barcode: productData.barcode || null,
      price: productData.price,
      compareAtPrice: productData.compareAtPrice || 0, //C
      // Fix costPrice default handling
      costPrice:
        productData.costPrice !== 0
          ? toNumeric(productData.costPrice)
          : toNumeric(productData.price) * 0.5,
      trackQuantity:
        productData.trackQuantity !== undefined
          ? productData.trackQuantity
          : true, // Default true per schema
      quantity: productData.quantity || 0,
      lowStockThreshold: productData.lowStockThreshold || 5,
      weight: productData.weight || 0, //C
      dimensions: productData.dimensions || null,
      status: productData.status || "draft",
      visibility: productData.visibility || "visible",
      categoryId: productData.categoryId,
      tags: productData.tags || [],
      seo_title: productData.seo_title || "",
      seo_description: productData.seo_description || "",
      vendor: productData.vendor || "",
      is_featured: productData.is_featured || false,
      is_new: productData.is_new || false,
      on_sale: productData.on_sale || false,
    };
    console.log("final prouct data for to insert : ", product);

    return await Product.insertProduct(product);
  },
};
