import pool from "../../config/database.js";

export const insertProductImages = async (images) => {
  const client = await pool.connect();
  try {
    const values = [];
    let paramCount = 1;
    const valueStrings = [];

    images.forEach((image) => {
      const valueGroup = [];
      ["product_id", "url", "alt_text", "sort_order", "is_main"].forEach(
        (field) => {
          values.push(image[field]);
          valueGroup.push(`$${paramCount++}`);
        }
      );
      valueStrings.push(`(${valueGroup.join(",")})`);
    });

    const query = `
      INSERT INTO product_images 
        (product_id, url, alt_text, sort_order, is_main)
      VALUES ${valueStrings.join(",")}
      RETURNING *
    `;

    const { rows } = await client.query(query, values);
    return rows; // Returns all inserted records
  } finally {
    client.release();
  }
};
