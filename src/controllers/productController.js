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
  try {
    // Directly return array of categories
    const products = await Product.getProducts();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch prodcuts: " + error.message,
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
