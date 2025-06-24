import pool from "../../config/database.js";

export const addToCart = async (req, res) => {
  const { product_id, quantity } = req.body;
  const user_id = req.user.id;

  console.log(
    `[AddToCart] Request by user: ${user_id} | Product: ${product_id} | Quantity: ${quantity}`
  );

  // Validate input
  if (!product_id || !quantity || quantity <= 0) {
    console.warn("[AddToCart] Invalid input:", { product_id, quantity });
    return res.status(400).json({ error: "Invalid product or quantity" });
  }

  try {
    // 1. Check stock
    console.log("[AddToCart] Checking stock for product:", product_id);
    const stockResult = await pool.query(
      "SELECT quantity FROM products WHERE id = $1",
      [product_id]
    );

    if (stockResult.rows.length === 0) {
      console.warn("[AddToCart] Product not found:", product_id);
      return res.status(404).json({ error: "Product not found" });
    }

    const availableStock = stockResult.rows[0].quantity;
    console.log(
      `[AddToCart] Available stock: ${availableStock} | Requested: ${quantity}`
    );
    if (availableStock < quantity) {
      console.warn("[AddToCart] Insufficient stock");
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // 2. Check if item already exists in cart
    console.log("[AddToCart] Checking if product already in cart");
    const findQuery = `
      SELECT id, quantity
      FROM cart_items
      WHERE user_id = $1
        AND product_id = $2
        AND variant_id IS NULL
    `;
    const findResult = await pool.query(findQuery, [user_id, product_id]);

    let result;
    if (findResult.rows.length > 0) {
      console.log("[AddToCart] Product already in cart. Updating quantity.");
      const updateQuery = `
        UPDATE cart_items
        SET quantity = quantity + $1,
            updated_at = NOW()
        WHERE id = $2
        RETURNING *;
      `;
      result = await pool.query(updateQuery, [quantity, findResult.rows[0].id]);
    } else {
      console.log("[AddToCart] Product not in cart. Inserting new item.");
      const insertQuery = `
        INSERT INTO cart_items
        (user_id, product_id, quantity)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      result = await pool.query(insertQuery, [user_id, product_id, quantity]);
    }

    console.log("[AddToCart] Operation successful. Cart item:", result.rows[0]);
    // Retrieve updated cart
    const query = `
      SELECT
        cart_items.id AS cart_item_id,
        cart_items.product_id,
        cart_items.quantity,
        products.name,
        products.price,
        (SELECT url 
          FROM product_images 
          WHERE product_id = products.id 
          AND is_main = TRUE 
          ORDER BY sort_order ASC 
          LIMIT 1) AS image_url
      FROM cart_items
      JOIN products ON cart_items.product_id = products.id
      WHERE cart_items.user_id = $1;
    `;

    const { rows } = await pool.query(query, [user_id]);
    console.log(
      `[GetCart] Retrieved ${rows.length} items for user: ${user_id}`
    );

    res.status(200).json(rows);
  } catch (error) {
    console.error("[AddToCart] Server error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const getCartByUser = async (req, res) => {
  if (!req.user) {
    console.warn("[GetCart] Unauthenticated access attempt");
    return res.status(401).json({ error: "Authentication required" });
  }

  const userId = req.user.id;
  console.log("[GetCart] Fetching cart items for user:", userId);

  try {
    const query = `
      SELECT
        cart_items.id AS cart_item_id,
        cart_items.product_id,
        cart_items.quantity,
        products.name,
        products.price,
        (SELECT url 
         FROM product_images 
         WHERE product_id = products.id 
         AND is_main = TRUE 
         ORDER BY sort_order ASC 
         LIMIT 1) AS image_url
      FROM cart_items
      JOIN products ON cart_items.product_id = products.id
      WHERE cart_items.user_id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    console.log(`[GetCart] Retrieved ${rows.length} items for user: ${userId}`);
    res.status(200).json(rows);
  } catch (error) {
    console.error("[GetCart] Internal server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateCartItem = async (req, res) => {
  console.log("[updateCartItem] Request received:", {
    params: req.params,
    body: req.body,
    user: req.user?.id || "no user",
  });

  try {
    // Check if user is authenticated
    if (!req.user) {
      console.warn("[updateCartItem] Unauthenticated request");
      return res.status(401).json({ error: "Authentication required" });
    }

    const userId = req.user.id;
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    console.log(
      `[updateCartItem] Processing update for user ${userId}, item ${cartItemId}, quantity ${quantity}`
    );

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      console.warn("[updateCartItem] Invalid quantity:", quantity);
      return res
        .status(400)
        .json({ error: "Quantity must be a positive integer" });
    }

    // Check if cart item exists for the user
    console.log("[updateCartItem] Checking cart item existence...");
    const cartItemRes = await pool.query(
      "SELECT * FROM cart_items WHERE id = $1 AND user_id = $2",
      [cartItemId, userId]
    );

    if (cartItemRes.rows.length === 0) {
      console.warn(
        `[updateCartItem] Cart item not found (id: ${cartItemId}, user: ${userId})`
      );
      return res.status(404).json({ error: "Cart item not found" });
    }

    const cartItem = cartItemRes.rows[0];
    console.log("[updateCartItem] Found cart item:", {
      productId: cartItem.product_id,
      currentQuantity: cartItem.quantity,
    });

    // Check stock availability
    console.log("[updateCartItem] Checking product stock...");
    const productRes = await pool.query(
      "SELECT quantity FROM products WHERE id = $1",
      [cartItem.product_id]
    );

    if (productRes.rows.length === 0) {
      console.warn(
        `[updateCartItem] Product not found (id: ${cartItem.product_id})`
      );
      return res.status(404).json({ error: "Product not found" });
    }

    const stock = productRes.rows[0].quantity;
    console.log("[updateCartItem] Current stock:", stock);

    if (quantity > stock) {
      console.warn("[updateCartItem] Insufficient stock:", {
        requested: quantity,
        available: stock,
      });
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Update cart item quantity
    console.log("[updateCartItem] Updating cart item quantity...");
    await pool.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [
      quantity,
      cartItemId,
    ]);
    console.log("[updateCartItem] Quantity updated successfully");

    // Retrieve updated cart
    console.log("[updateCartItem] Retrieving updated cart...");
    const query = `
      SELECT
        cart_items.id AS cart_item_id,
        cart_items.product_id,
        cart_items.quantity,
        products.name,
        products.price,
        (SELECT url 
         FROM product_images 
         WHERE product_id = products.id 
         AND is_main = TRUE 
         ORDER BY sort_order ASC 
         LIMIT 1) AS image_url
      FROM cart_items
      JOIN products ON cart_items.product_id = products.id
      WHERE cart_items.user_id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    console.log(
      `[updateCartItem] Retrieved ${rows.length} items for user: ${userId}`
    );
    console.debug("[updateCartItem] Cart contents:", rows);

    res.status(200).json(rows);
  } catch (error) {
    console.error("[updateCartItem] Error:", {
      message: error.message,
      stack: error.stack,
      fullError: error,
    });
    res.status(500).json({ error: "Internal server error" });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userId = req.user.id;
    const cartItemId = req.params.id;

    console.log("Remove item req received in backend for user Id : ", userId);
    console.log(
      "Remove item req received in backend for cart item id : ",
      cartItemId
    );

    // Delete cart item
    const result = await pool.query(
      "DELETE FROM cart_items WHERE id = $1 AND user_id = $2",
      [cartItemId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    // Retrieve updated cart
    const query = `
      SELECT
        cart_items.id AS cart_item_id,
        cart_items.product_id,
        cart_items.quantity,
        products.name,
        products.price,
        (SELECT url 
         FROM product_images 
         WHERE product_id = products.id 
         AND is_main = TRUE 
         ORDER BY sort_order ASC 
         LIMIT 1) AS image_url
      FROM cart_items
      JOIN products ON cart_items.product_id = products.id
      WHERE cart_items.user_id = $1;
    `;

    const { rows } = await pool.query(query, [userId]);
    console.log(`[GetCart] Retrieved ${rows.length} items for user: ${userId}`);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
