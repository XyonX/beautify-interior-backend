import productService from "../services/productService.js";
import imageService from "../services/imageService.js";
import Product from "../models/productModel.js";

export const createProduct = async (req, res) => {
  const requiredFields = [
    "name",
    "description",
    "sku",
    "price",
    "categoryId",
    "thumbnail",
  ];
  console.log("Received data in backend: ", req.body);

  const missingFields = requiredFields.filter((field) => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: `Missing required fields: ${missingFields.join(", ")}`,
    });
  }

  try {
    const newProduct = await productService.createProduct(req.body);
    await imageService.createImages(newProduct, req.productImages);

    res.status(201).json(newProduct);
  } catch (error) {
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
};
