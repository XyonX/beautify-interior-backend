import pool from "../../config/database.js";

const categoryModel = {
  insertCategory: async (data) => {
    const values = [
      data.name,
      data.slug,
      data.description,
      data.image,
      data.parent_id,
      data.is_active,
      data.sort_order,
      data.seo_title,
      data.seo_description,
    ];

    const query = `INSERT INTO categories (name, slug, description, image, parent_id, is_active, sort_order, seo_title, seo_description)
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                  RETURNING *`;
    const { rows } = await pool.query(query, values); // Added await
    return rows[0];
  },

  findCategories: async () => {
    const query = `SELECT id ,name,slug,description,image,parent_id,is_active,sort_order,seo_title,seo_description FROM categories`;
    const { rows } = await pool.query(query); // Added await
    return rows; // Return all rows, not just first one
  },

  slugExists: async (slug) => {
    const query = "SELECT 1 FROM categories WHERE slug = $1 LIMIT 1";
    const { rows } = await pool.query(query, [slug]);
    return rows.length > 0;
  },
};

export default categoryModel;
