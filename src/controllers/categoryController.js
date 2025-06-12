import categoryService from "../services/categoryService.js";
import Category from "../models/categoryModel.js";

// CREATE CATEGORY
export const createCategory = async (req, res) => {
  console.log(req.body);
  const { name, thumbnail } = req.body;

  // Validation
  if (!name || !thumbnail) {
    return res.status(400).json({
      error: "Missing required fields: name and image",
    });
  }

  try {
    // Directly return created resource
    const newCategory = await categoryService.createCategory(req.body);
    res.status(201).json(newCategory);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// GET ALL CATEGORIES
export const getCategories = async (req, res) => {
  try {
    // Directly return array of categories
    const categories = await Category.findCategories();
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch categories: " + error.message,
    });
  }
};
