import Router from "express";
import authMiddleware from "../middleware/authMiddleware.js";
// const db = require("../db"); // Your database connection
import pool from "../../config/database.js"; //USE THIS instead of db

const router = Router();

// Add a new address
router.post("/", authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  const { street, city, state, zip, country, type, is_default } = req.body;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Unset other defaults if needed
    if (is_default) {
      await client.query(
        "UPDATE addresses SET is_default = false WHERE user_id = $1",
        [user_id]
      );
    }

    // Insert new address and return it
    const insertResult = await client.query(
      `INSERT INTO addresses 
        (user_id, street, city, state, zip, country, type, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        user_id,
        street,
        city,
        state,
        zip,
        country,
        type || "shipping",
        is_default || false,
      ]
    );

    const newAddressId = insertResult.rows[0].id;

    // Fetch the full inserted address
    const addressResult = await client.query(
      `SELECT 
        id, 
        street, 
        city, 
        state, 
        zip, 
        country, 
        type,
        is_default AS "isDefault"
      FROM addresses 
      WHERE id = $1`,
      [newAddressId]
    );

    await client.query("COMMIT");

    if (!addressResult.rows.length) {
      return res
        .status(500)
        .json({ error: "Failed to retrieve created address" });
    }

    res.status(201).json(addressResult.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Add address error:", error);

    const errorMessage =
      error.code === "23505"
        ? "Address already exists"
        : "Failed to add address";

    res.status(500).json({ error: errorMessage });
  } finally {
    client.release();
  }
});

// Get all addresses for a user
router.get("/", authMiddleware, async (req, res) => {
  const user_id = req.user.id;

  try {
    const rows = await pool.query(
      `SELECT 
      id, 
      street, 
      city, 
      state, 
      zip, 
      country, 
      type,
      is_default AS isDefault
      FROM addresses WHERE user_id =$1`,
      [user_id]
    );
    res.json(rows);
  } catch (error) {
    console.error("Get addresses error:", error);
    res.status(500).json({ error: "Failed to retrieve addresses" });
  }
});

// Update an address
router.put("/:id", authMiddleware, async (req, res) => {
  const user_id = req.user.id;
  const address_id = req.params.id;
  const { street, city, state, zip, country, type, isDefault } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // If setting as default, unset others
    if (isDefault) {
      await connection.query(
        "UPDATE addresses SET is_default = false WHERE user_id = $1 AND id != $2",
        [user_id, address_id]
      );
    }

    //update address
    await connection.query(
      ` UPDAE addresses SET 
        street = $1, 
        city = $2, 
        state = $3, 
        zip = $4, 
        country = $5, 
        type = $6,
        is_default = $7
        WHERE id = $8 AND user_id = $9`,
      [
        street,
        city,
        state,
        zip,
        country,
        type || "shipping",
        isDefault || false,
        address_id,
        user_id,
      ]
    );

    // Fetch updated address
    const [updated] = await connection.query(
      `SELECT 
            id, 
            street, 
            city, 
            state, 
            zip, 
            country, 
            type,
            is_default AS isDefault
          FROM addresses WHERE id = ?`,
      [address_id]
    );

    await connection.commit();

    if (!updated.length) {
      return res.status(404).json({ error: "Address not found" });
    }

    res.json(updated[0]);
  } catch (error) {
    await connection.rollback();
    console.error("Update address error:", error);
    res.status(500).json({ error: "Failed to update address" });
  } finally {
    connection.release();
  }
});

// // Updated order route
// router.post("/orders", authMiddleware, async (req, res) => {
//   const user_id = req.user.id;
//   const { shipping_address, billing_address, items } = req.body;

//   // Basic validation
//   if (!shipping_address || !billing_address || !items) {
//     return res.status(400).json({ error: "Missing required fields" });
//   }

//   try {
//     const [result] = await db.query(
//       "INSERT INTO orders (user_id, shipping_address, billing_address, status) VALUES (?, ?, ?, ?)",
//       [
//         user_id,
//         JSON.stringify(shipping_address),
//         JSON.stringify(billing_address),
//         "pending",
//       ]
//     );
//     // Assume items are handled separately in an order_items table
//     res
//       .status(201)
//       .json({ order_id: result.insertId, message: "Order created" });
//   } catch (error) {
//     res.status(500).json({ error: "Failed to create order" });
//   }
// });

export default router;
