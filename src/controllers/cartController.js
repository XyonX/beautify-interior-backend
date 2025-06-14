export const addToCart = async (req, res) => {
  const { product_id, variant_id, quantity } = req.body;
  const user_id = req.user?.id; // From auth middleware
  const session_id = req.cookies.session_id || crypto.randomUUID();

  try {
    // Check stock
    // const stockQuery = variant_id
    //   ? "SELECT quantity FROM product_variants WHERE id = $1"
    //   : "SELECT quantity FROM products WHERE id = $1";

    const stockQuery = "SELECT quantity FROM products WHERE id = $1";
    const stockResult = await pool.query(stockQuery, [product_id]);
    const availableStock = stockResult.rows[0]?.quantity || 0;

    if (availableStock < quantity) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Upsert cart item
    const upsertQuery = `
   INSERT INTO cart_items (user_id, session_id, product_id, variant_id, quantity)
   VALUES ($1, $2, $3, $4, $5)
   ON CONFLICT (user_id, product_id, variant_id)
   DO UPDATE SET quantity = cart_items.quantity + EXCLUDED.quantity, updated_at = NOW()
   RETURNING *;
 `;
    const values = [
      user_id,
      user_id ? null : session_id,
      product_id,
      variant_id,
      quantity,
    ];
    const result = await pool.query(upsertQuery, values);

    if (!user_id) res.cookie("session_id", session_id, { httpOnly: true });
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
};

// Retrieve cart items for a user.
export const getCartByUser = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const userId = req.user.id;

  try {
    const query = `SELECT * FROM cart_items WHERE user_id = $1`;
    const { rows } = await pool.query(query, [userId]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching cart:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const updateCartItem = async (req, res) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const userId = req.user.id;
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    // Validate quantity
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res
        .status(400)
        .json({ error: "Quantity must be a positive integer" });
    }

    // Check if cart item exists for the user
    const cartItemRes = await pool.query(
      "SELECT * FROM cart_items WHERE id = $1 AND user_id = $2",
      [cartItemId, userId]
    );
    if (cartItemRes.rows.length === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }
    const cartItem = cartItemRes.rows[0];

    // Check stock availability
    let stock;
    if (cartItem.variant_id) {
      const variantRes = await pool.query(
        "SELECT quantity FROM product_variants WHERE id = $1",
        [cartItem.variant_id]
      );
      if (variantRes.rows.length === 0) {
        return res.status(404).json({ error: "Variant not found" });
      }
      stock = variantRes.rows[0].quantity;
    } else {
      const productRes = await pool.query(
        "SELECT quantity FROM products WHERE id = $1",
        [cartItem.product_id]
      );
      if (productRes.rows.length === 0) {
        return res.status(404).json({ error: "Product not found" });
      }
      stock = productRes.rows[0].quantity;
    }
    if (quantity > stock) {
      return res.status(400).json({ error: "Insufficient stock" });
    }

    // Update cart item quantity
    await pool.query("UPDATE cart_items SET quantity = $1 WHERE id = $2", [
      quantity,
      cartItemId,
    ]);

    // Retrieve updated cart
    const cartRes = await pool.query(
      "SELECT * FROM cart_items WHERE user_id = $1",
      [userId]
    );
    const cartItems = cartRes.rows;

    res.status(200).json({ message: "Cart item updated", cart: cartItems });
  } catch (error) {
    console.error("Error updating cart item:", error);
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

    // Delete cart item
    const result = await pool.query(
      "DELETE FROM cart_items WHERE id = $1 AND user_id = $2",
      [cartItemId, userId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Cart item not found" });
    }

    // Retrieve updated cart
    const cartRes = await pool.query(
      "SELECT * FROM cart_items WHERE user_id = $1",
      [userId]
    );
    const cartItems = cartRes.rows;

    res.status(200).json({ message: "Cart item removed", cart: cartItems });
  } catch (error) {
    console.error("Error removing cart item:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
