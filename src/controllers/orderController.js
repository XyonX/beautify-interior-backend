import pool from "../../config/database.js";
import { v4 as uuidv4 } from "uuid";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const getOrderById = async (req, res) => {
  console.log("Get user by id called");
  const { id } = req.params;
  const userId = req.user?.id;

  console.log("[getOrderById] Request Params:", req.params);
  console.log("[getOrderById] Authenticated User ID:", userId);

  if (!id) {
    console.warn("[getOrderById] Missing order ID in request.");
    return res.status(400).json({ message: "Order ID is required." });
  }

  try {
    const orderQuery = `
      SELECT 
        o.*,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', ROUND(oi.price * 100)::integer,
                'total', ROUND(oi.total * 100)::integer,
                'name', p.name,
                'sku', p.sku,
                'image', pi.url
              )
            ),
            '[]'::json
          )
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main
          WHERE oi.order_id = o.id
        ) AS items
      FROM orders o
      WHERE o.id = $1
        AND ($2::uuid IS NULL OR o.user_id = $2);
    `;

    console.log("[getOrderById] Executing query with values:", [id, userId]);

    const result = await pool.query(orderQuery, [id, userId]);

    console.log("[getOrderById] Query Result:", result.rows);

    if (result.rows.length === 0) {
      console.warn("[getOrderById] No order found for ID:", id);
      return res.status(404).json({ message: "Order not found." });
    }

    const order = result.rows[0];

    const response = {
      ...omitAddressFields(order),
      totals: {
        subtotal: Math.round(order.subtotal * 100),
        tax: Math.round(order.tax_amount * 100),
        shipping: Math.round(order.shipping_amount * 100),
        discount: Math.round(order.discount_amount * 100),
        total: Math.round(order.total * 100),
      },
      shipping_address: formatAddress(order, "shipping"),
      billing_address: formatAddress(order, "billing"),
      items: order.items,
    };

    console.log("[getOrderById] Final response:", response);

    return res.status(200).json(removeNulls(response));
  } catch (error) {
    console.error("[getOrderById] Error fetching order:", error);
    return res.status(500).json({
      code: "ORDER_FETCH_ERROR",
      message: "Error fetching order: " + error.message,
    });
  }
};

// Helper function to format a single order
const formatOrder = (order) => {
  const base = omitAddressFields(order);
  const totals = {
    subtotal: Math.round(order.subtotal * 100),
    tax: Math.round(order.tax_amount * 100),
    shipping: Math.round(order.shipping_amount * 100),
    discount: Math.round(order.discount_amount * 100),
    total: Math.round(order.total * 100),
  };
  const shipping_address = formatAddress(order, "shipping");
  const billing_address = formatAddress(order, "billing");
  const items = order.items;

  const response = {
    ...base,
    totals,
    shipping_address,
    billing_address,
    items,
  };

  return removeNulls(response);
};

// Helper functions
const formatAddress = (order, type) => {
  const fields = [
    "first_name",
    "last_name",
    "company",
    "address",
    "address2",
    "city",
    "state",
    "zip_code",
    "country",
    "phone",
  ];

  const address = {};
  fields.forEach((field) => {
    const value = order[`${type}_${field}`];
    if (value !== null && value !== undefined) {
      address[field] = value;
    }
  });

  return Object.keys(address).length > 0 ? address : null;
};

const omitAddressFields = (order) => {
  const clone = { ...order };

  // Remove address fields from root object
  const addressPrefixes = ["shipping_", "billing_"];
  Object.keys(clone).forEach((key) => {
    if (addressPrefixes.some((prefix) => key.startsWith(prefix))) {
      delete clone[key];
    }
  });

  // Remove unnecessary fields
  delete clone.items;

  return clone;
};

const removeNulls = (obj) => {
  if (obj === null) return null;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(removeNulls);
  }

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([_, v]) => v !== null && v !== undefined)
      .map(([k, v]) => [k, removeNulls(v)])
  );
};

// Controller function to get orders by user
export const getOrdersByUser = async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const ordersQuery = `
      SELECT 
        o.*,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', oi.id,
                'product_id', oi.product_id,
                'quantity', oi.quantity,
                'price', ROUND(oi.price * 100)::integer,
                'total', ROUND(oi.total * 100)::integer,
                'name', p.name,
                'sku', p.sku,
                'image', pi.url
              )
            ),
            '[]'::json
          )
          FROM order_items oi
          LEFT JOIN products p ON oi.product_id = p.id
          LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main
          WHERE oi.order_id = o.id
        ) AS items
      FROM orders o
      WHERE o.user_id = $1
      ORDER BY o.created_at DESC;
    `;

    const result = await pool.query(ordersQuery, [userId]);

    const formattedOrders = result.rows.map(formatOrder);

    return res.status(200).json(formattedOrders);
  } catch (error) {
    return res.status(500).json({
      code: "ORDERS_FETCH_ERROR",
      message: "Error fetching orders: " + error.message,
    });
  }
};

export const createOrder = async (req, res) => {
  try {
    console.log("Starting createOrder process");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User:", req.user);
    console.log("Session ID:", req.sessionID);

    const { shippingInfo, shippingMethod, addressId, couponCode } = req.body;
    const userId = req.user?.id;

    // Step 1: Retrieve cart items
    console.log("Step 1: Retrieving cart items");
    const cartQuery = `
        SELECT ci.product_id, ci.variant_id, ci.quantity, p.price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1 OR ci.session_id = $2
      `;
    console.log("Cart query:", cartQuery);
    console.log("Query params:", [userId, req.sessionID]);

    const cartResult = await pool.query(cartQuery, [userId, req.sessionID]);
    const cartItems = cartResult.rows;
    console.log("Cart items retrieved:", cartItems);

    if (!cartItems.length) {
      console.log("Cart is empty");
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Step 2: Validate stock availability
    console.log("Step 2: Validating stock availability");
    for (const item of cartItems) {
      console.log(
        `Checking stock for product ${item.product_id}, variant ${item.variant_id}`
      );
      const product = await pool.query(
        "SELECT quantity FROM products WHERE id = $1",
        [item.product_id]
      );
      console.log(
        `Product ${item.product_id} stock:`,
        product.rows[0].quantity
      );

      if (product.rows[0].quantity < item.quantity) {
        console.log(`Insufficient stock for product ${item.product_id}`);
        return res.status(400).json({
          message: `Insufficient stock for product ${item.product_id}`,
        });
      }
    }

    // Step 3: Calculate order totals
    console.log("Step 3: Calculating order totals");
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    console.log("Subtotal:", subtotal);

    const taxAmount = subtotal * 0.18; // Example: 18% tax
    console.log("Tax amount:", taxAmount);

    const shippingAmount =
      shippingMethod === "standard"
        ? subtotal > 500
          ? 0
          : 100
        : shippingMethod === "express"
        ? 199
        : 299;
    console.log(
      "Shipping method:",
      shippingMethod,
      "Shipping amount:",
      shippingAmount
    );

    let discountAmount = 0;

    // Handle coupon if provided
    if (couponCode) {
      console.log("Processing coupon code:", couponCode);
      const couponQuery = `
          SELECT value, type FROM coupons
          WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
        `;
      const coupon = await pool.query(couponQuery, [couponCode]);
      console.log("Coupon query result:", coupon.rows);

      if (coupon.rows.length) {
        const { value, type } = coupon.rows[0];
        discountAmount =
          type === "percentage" ? (subtotal * value) / 100 : value;
        console.log("Discount applied:", discountAmount, "Type:", type);
      }
    }

    const total = subtotal + taxAmount + shippingAmount - discountAmount;
    console.log("Final total:", total);

    // Step 3.2: Fetch address if addressId is provided (only for logged-in users)
    console.log("Step 3.2: Processing shipping info");
    let finalShippingInfo = shippingInfo || {};
    console.log("Initial shipping info:", finalShippingInfo);

    if (userId && addressId) {
      console.log("Fetching address from DB with addressId:", addressId);
      const addressQuery = `
        SELECT first_name, last_name, address, zip_code, city, state, country, phone
        FROM addresses
        WHERE id = $1 AND user_id = $2
      `;
      const addressResult = await pool.query(addressQuery, [addressId, userId]);
      const address = addressResult.rows[0];
      console.log("Address from DB:", address);

      if (address) {
        finalShippingInfo = {
          firstName: address.first_name,
          lastName: address.last_name,
          address: address.address,
          zipCode: address.zip_code,
          city: address.city,
          state: address.state,
          country: address.country,
          phone: address.phone,
        };
        console.log("Updated shipping info from address:", finalShippingInfo);
      }
    }

    // Step 4: Create order record
    console.log("Step 4: Creating order record");
    const orderQuery = `
      INSERT INTO orders (
        id, order_number, user_id, email, status, payment_status, fulfillment_status,
        subtotal, tax_amount, shipping_amount, discount_amount, total, currency,
        shipping_first_name, shipping_last_name, shipping_address, shipping_city,
        shipping_state, shipping_zip_code, shipping_country, shipping_phone,
        payment_method, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,$23)
      RETURNING id
    `;
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 5)}`; // Improved uniqueness
    console.log("Generated order ID:", orderId);
    console.log("Generated order number:", orderNumber);

    const orderValues = [
      orderId,
      orderNumber,
      userId,
      req.user?.email || finalShippingInfo.email || "guest@example.com",
      "confirmed",
      "pending",
      "unfulfilled",
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      total,
      "INR",
      finalShippingInfo.firstName,
      finalShippingInfo.lastName,
      finalShippingInfo.address,
      finalShippingInfo.city,
      finalShippingInfo.state,
      finalShippingInfo.zipCode,
      finalShippingInfo.country,
      finalShippingInfo.phone,
      "cod",
      "web",
    ];
    console.log("Order values:", orderValues);

    const orderResult = await pool.query(orderQuery, orderValues);
    console.log("Order created successfully in DB:", orderResult.rows[0]);

    // Step 5: Create order_items records
    console.log("Step 5: Creating order items");
    for (const item of cartItems) {
      console.log("Processing cart item:", item);
      const itemQuery = `
        INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, price, total)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const itemValues = [
        uuidv4(),
        orderId,
        item.product_id,
        item.variant_id,
        item.quantity,
        item.price,
        item.price * item.quantity,
      ];
      console.log("Order item values:", itemValues);

      await pool.query(itemQuery, itemValues);
      console.log("Order item created successfully");
    }

    // Step 6: Clear the cart
    console.log("Step 6: Clearing cart");
    await pool.query(
      "DELETE FROM cart_items WHERE user_id = $1 OR session_id = $2",
      [userId, req.sessionID]
    );
    console.log("Cart cleared successfully");
    console.log("Order creation successful. Order ID:", orderId);

    // Step 7: Respond with order details
    console.log("Step 7: Sending response");
    res.status(201).json({
      message: "Order created successfully",
      orderId,
      orderNumber,
      total,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Failed to create order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const createPendingOrder = async (req, res) => {
  try {
    console.log("Starting createOrder process");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User:", req.user);
    console.log("Session ID:", req.sessionID);

    const { shippingInfo, shippingMethod, addressId, couponCode } = req.body;
    const userId = req.user?.id;

    // Step 1: Retrieve cart items
    console.log("Step 1: Retrieving cart items");
    const cartQuery = `
        SELECT ci.product_id, ci.variant_id, ci.quantity, p.price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        WHERE ci.user_id = $1 OR ci.session_id = $2
      `;
    console.log("Cart query:", cartQuery);
    console.log("Query params:", [userId, req.sessionID]);

    const cartResult = await pool.query(cartQuery, [userId, req.sessionID]);
    const cartItems = cartResult.rows;
    console.log("Cart items retrieved:", cartItems);

    if (!cartItems.length) {
      console.log("Cart is empty");
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Step 2: Validate stock availability
    console.log("Step 2: Validating stock availability");
    for (const item of cartItems) {
      console.log(
        `Checking stock for product ${item.product_id}, variant ${item.variant_id}`
      );
      const product = await pool.query(
        "SELECT quantity FROM products WHERE id = $1",
        [item.product_id]
      );
      console.log(
        `Product ${item.product_id} stock:`,
        product.rows[0].quantity
      );

      if (product.rows[0].quantity < item.quantity) {
        console.log(`Insufficient stock for product ${item.product_id}`);
        return res.status(400).json({
          message: `Insufficient stock for product ${item.product_id}`,
        });
      }
    }

    // Step 3: Calculate order totals
    console.log("Step 3: Calculating order totals");
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    console.log("Subtotal:", subtotal);

    // const taxAmount = subtotal * 0.18; // Example: 18% tax
    const taxAmount = 0; // Example: 18% tax
    console.log("Tax amount:", taxAmount);

    const shippingAmount =
      shippingMethod === "standard"
        ? subtotal > 500
          ? 0
          : 100
        : shippingMethod === "express"
        ? 199
        : 299;
    console.log(
      "Shipping method:",
      shippingMethod,
      "Shipping amount:",
      shippingAmount
    );

    let discountAmount = 0;

    // Handle coupon if provided
    if (couponCode) {
      console.log("Processing coupon code:", couponCode);
      const couponQuery = `
          SELECT value, type FROM coupons
          WHERE code = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > NOW())
        `;
      const coupon = await pool.query(couponQuery, [couponCode]);
      console.log("Coupon query result:", coupon.rows);

      if (coupon.rows.length) {
        const { value, type } = coupon.rows[0];
        discountAmount =
          type === "percentage" ? (subtotal * value) / 100 : value;
        console.log("Discount applied:", discountAmount, "Type:", type);
      }
    }

    const total = subtotal + taxAmount + shippingAmount - discountAmount;
    console.log("Final total:", total);

    // Step 3.2: Fetch address if addressId is provided (only for logged-in users)
    console.log("Step 3.2: Processing shipping info");
    let finalShippingInfo = shippingInfo || {};
    console.log("Initial shipping info:", finalShippingInfo);

    if (userId && addressId) {
      console.log("Fetching address from DB with addressId:", addressId);
      const addressQuery = `
        SELECT first_name, last_name, address, zip_code, city, state, country, phone
        FROM addresses
        WHERE id = $1 AND user_id = $2
      `;
      const addressResult = await pool.query(addressQuery, [addressId, userId]);
      const address = addressResult.rows[0];
      console.log("Address from DB:", address);

      if (address) {
        finalShippingInfo = {
          firstName: address.first_name,
          lastName: address.last_name,
          address: address.address,
          zipCode: address.zip_code,
          city: address.city,
          state: address.state,
          country: address.country,
          phone: address.phone,
        };
        console.log("Updated shipping info from address:", finalShippingInfo);
      }
    }

    // Step 4: Create order record
    console.log("Step 4: Creating order record");
    const orderQuery = `
      INSERT INTO orders (
        id, order_number, user_id, email, status, payment_status, fulfillment_status,
        subtotal, tax_amount, shipping_amount, discount_amount, total, currency,
        shipping_first_name, shipping_last_name, shipping_address, shipping_city,
        shipping_state, shipping_zip_code, shipping_country, shipping_phone,
        payment_method, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22,$23)
      RETURNING id
    `;
    const orderId = uuidv4();
    const orderNumber = `ORD-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 5)}`; // Improved uniqueness
    console.log("Generated order ID:", orderId);
    console.log("Generated order number:", orderNumber);

    const orderValues = [
      orderId,
      orderNumber,
      userId,
      req.user?.email || finalShippingInfo.email || "guest@example.com",
      "pending",
      "pending",
      "unfulfilled",
      subtotal,
      taxAmount,
      shippingAmount,
      discountAmount,
      total,
      "INR",
      finalShippingInfo.firstName,
      finalShippingInfo.lastName,
      finalShippingInfo.address,
      finalShippingInfo.city,
      finalShippingInfo.state,
      finalShippingInfo.zipCode,
      finalShippingInfo.country,
      finalShippingInfo.phone,
      "razorpay",
      "web",
    ];
    console.log("Order values:", orderValues);

    const orderResult = await pool.query(orderQuery, orderValues);
    console.log("Order created successfully in DB:", orderResult.rows[0]);

    // Step 5: Create order_items records
    console.log("Step 5: Creating order items");
    for (const item of cartItems) {
      console.log("Processing cart item:", item);
      const itemQuery = `
        INSERT INTO order_items (id, order_id, product_id, variant_id, quantity, price, total)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `;
      const itemValues = [
        uuidv4(),
        orderId,
        item.product_id,
        item.variant_id,
        item.quantity,
        item.price,
        item.price * item.quantity,
      ];
      console.log("Order item values:", itemValues);

      await pool.query(itemQuery, itemValues);
      console.log("Order item created successfully");
    }

    //Step-06 Clear cart
    //TODO REMOVED THIS SECTION

    // Step 7: Respond with order details

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(total * 100),
      currency: "INR",
      receipt: orderNumber,
      payment_capture: 1, // Auto-capture payment
    });

    // Optionally store Razorpay order ID
    await pool.query("UPDATE orders SET payment_intent_id = $1 WHERE id = $2", [
      razorpayOrder.id,
      orderId,
    ]);

    console.log("Step 7: Sending response");
    res.status(201).json({
      message: "Order created successfully",
      orderId,
      razorpay_order_id: razorpayOrder.id,
      orderNumber,
      total,
    });
  } catch (error) {
    console.error("Error in createOrder:", error);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      message: "Failed to create order",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    console.log("🧾 Starting payment verification...");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("User:", req.user);
    console.log("Session ID:", req.sessionID);

    const {
      order_id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = req.body;

    // Verify payment signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      console.warn("❌ Signature mismatch");
      return res.status(400).json({ message: "Invalid payment signature" });
    }

    // Optional: Verify payment status with Razorpay API
    const payment = await razorpay.payments.fetch(razorpay_payment_id);
    if (payment.status !== "captured") {
      console.warn("❌ Payment not captured:", payment.status);
      return res.status(400).json({ message: "Payment not captured" });
    }

    // Update order in the database
    const updateQuery = `
      UPDATE orders
      SET status = 'processing', payment_status = 'paid'
      WHERE id = $1 AND payment_intent_id = $2
      RETURNING order_number
    `;
    const updateResult = await pool.query(updateQuery, [
      order_id,
      razorpay_order_id,
    ]);

    if (!updateResult.rows.length) {
      console.warn("⚠️ Order not found with given ID and payment_intent_id");
      return res.status(404).json({ message: "Order not found" });
    }

    // Clear cart
    const userId = req.user?.id;
    console.log(
      "🛒 Clearing cart for user:",
      userId,
      "and session:",
      req.sessionID
    );
    await pool.query(
      "DELETE FROM cart_items WHERE user_id = $1 OR session_id = $2",
      [userId, req.sessionID]
    );

    // Respond with success
    console.log(
      "✅ Payment verified successfully for order:",
      updateResult.rows[0].order_number
    );
    res.status(200).json({
      message: "Payment verified successfully",
      order_number: updateResult.rows[0].order_number,
      order_id,
    });
  } catch (error) {
    console.error("🔥 Error in verifyPayment:", error);
    res.status(500).json({ message: "Failed to verify payment" });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const query = `
      SELECT 
        id, 
        order_number, 
        user_id, 
        email, 
        status, 
        payment_status, 
        fulfillment_status, 
        subtotal, 
        tax_amount, 
        shipping_amount, 
        discount_amount, 
        total, 
        currency, 
        shipping_first_name, 
        shipping_last_name, 
        shipping_company, 
        shipping_address, 
        shipping_address2, 
        shipping_city, 
        shipping_state, 
        shipping_zip_code, 
        shipping_country, 
        shipping_phone, 
        billing_first_name, 
        billing_last_name, 
        billing_company, 
        billing_address, 
        billing_address2, 
        billing_city, 
        billing_state, 
        billing_zip_code, 
        billing_country, 
        billing_phone, 
        shipping_method_id, 
        payment_method, 
        notes, 
        tags, 
        tracking_number, 
        tracking_url, 
        estimated_delivery, 
        actual_delivery, 
        source, 
        created_at, 
        updated_at 
      FROM orders
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
