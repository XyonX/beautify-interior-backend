import Category from "../models/categoryModel.js";
import slugify from "slugify";

const categoryService = {
  generateUniqueSlug: async (baseSlug) => {
    let slug = baseSlug;
    let counter = 1;

    while (await Category.slugExists(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }
    return slug;
  },

  createCategory: async (categoryData) => {
    const slug = slugify(categoryData.name, { lower: true, strict: true });
    const uniqueSlug = await categoryService.generateUniqueSlug(slug); // Fixed this reference

    const category = {
      name: categoryData.name,
      slug: uniqueSlug,
      description: categoryData.description || "",
      image: categoryData.thumbnail,
      parent_id: categoryData.parent_id || null,
      is_active: categoryData.is_active ?? true,
      sort_order: categoryData.sort_order || 0,
      seo_title: categoryData.seo_title || "",
      seo_description: categoryData.seo_description || "",
    };

    return await Category.insertCategory(category);
  },
};

export default categoryService;
