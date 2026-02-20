const Cart = require("../models/cart.js");
const Product = require("../models/products.js"); 

const clampQty = (q) => {
    const n = parseInt(q, 10);
    if (!Number.isFinite(n) || n < 1) return 1;
    return Math.min(99, n);
};

const getOrCreateCart = async (userId) => {
    let cart = await Cart.findOne({ userId });
    if (!cart) cart = await Cart.create({ userId, items: [] });
    return cart;
};

exports.getCount = async (req, res) => {
    const cart = await getOrCreateCart(req.user.id);
    return res.json({ count: cart.totalItems || 0 });
};

exports.add = async (req, res) => {
    const { productId, quantity = 1 } = req.body;

    if (!productId) return res.status(400).json({ message: "productId required" });

    const qtyToAdd = clampQty(quantity);

    // Always read price/title/etc from DB
    const product = await Product.findById(productId).select("title slug brand price images stock inStock");
    if (!product) return res.status(404).json({ message: "Product not found" });
    if (!product.inStock) return res.status(400).json({ message: "Out of stock" });

    // If you track stock count, enforce it
    const availableStock = Number.isFinite(product.stock) ? product.stock : null;

    const cart = await getOrCreateCart(req.user.id);

    const existing = cart.items.find((it) => String(it.productId) === String(productId));

    if (existing) {
        const nextQty = clampQty(existing.quantity + qtyToAdd);

        if (availableStock !== null && nextQty > availableStock) {
            return res.status(400).json({ message: `Only ${availableStock} left in stock` });
        }

        existing.quantity = nextQty;
        // Keep snapshot updated (optional). If you want strict "price at first add", remove these lines.
        existing.price = product.price;
        existing.name = product.title;
        existing.slug = product.slug;
        existing.image = product.images?.[0] || existing.image;
    } else {
        if (availableStock !== null && qtyToAdd > availableStock) {
            return res.status(400).json({ message: `Only ${availableStock} left in stock` });
        }

        cart.items.push({
            productId: product._id,
            name: product.title,
            slug: product.slug,
            image: product.images?.[0] || "",
            price: product.price,
            quantity: qtyToAdd
        });
    }

    await cart.save();

    const addedItem = cart.items.find((it) => String(it.productId) === String(productId));

    return res.json({
        message: "Added to cart",
        count: cart.totalItems || 0,
        addedItem: {
            productId: String(addedItem.productId),
            name: addedItem.name,
            slug: addedItem.slug,
            image: addedItem.image,
            price: addedItem.price,
            quantity: addedItem.quantity
        }
    });
};

exports.updateQuantity = async (req, res) => {
    const { productId, quantity } = req.body;
    if (!productId) return res.status(400).json({ message: "productId required" });

    const q = parseInt(quantity, 10);
    if (!Number.isFinite(q)) return res.status(400).json({ message: "quantity must be a number" });

    const cart = await getOrCreateCart(req.user.id);

    const idx = cart.items.findIndex((it) => String(it.productId) === String(productId));
    if (idx < 0) return res.status(404).json({ message: "Item not in cart" });

    if (q <= 0) {
        cart.items.splice(idx, 1);
        await cart.save();
        return res.json({ message: "Item removed", count: cart.totalItems || 0 });
    }

    const nextQty = clampQty(q);

    // Optional: stock validation
    const product = await Product.findById(productId).select("stock inStock price title slug images");
    if (!product || !product.inStock) return res.status(400).json({ message: "Item unavailable" });
    const availableStock = Number.isFinite(product.stock) ? product.stock : null;
    if (availableStock !== null && nextQty > availableStock) {
        return res.status(400).json({ message: `Only ${availableStock} left in stock` });
    }

    cart.items[idx].quantity = nextQty;
    // keep snapshot fresh (optional)
    cart.items[idx].price = product.price;
    cart.items[idx].name = product.title;
    cart.items[idx].slug = product.slug;
    cart.items[idx].image = product.images?.[0] || cart.items[idx].image;

    await cart.save();

    return res.json({ message: "Cart updated", count: cart.totalItems || 0 });
};


// ─────────────────────────────────────────────────────────────
// Helper — send consistent error responses
// ─────────────────────────────────────────────────────────────
const err = (res, status, message) => res.status(status).json({ success: false, message });

// ─────────────────────────────────────────────────────────────
// POST /api/cart/add
// Body: { productId, quantity }
// ─────────────────────────────────────────────────────────────
exports.addToCart = async (req, res) => {
  try {
    const userId    = req.user.id;                          // set by your auth middleware
    const { productId, quantity = 1 } = req.body;

    if (!productId) return err(res, 400, 'productId is required');

    const qty = Math.min(Math.max(parseInt(quantity, 10) || 1, 1), 99);

    // Always pull price from DB — never trust client-sent price
    const product = await Product.findById(productId).lean();
    if (!product)          return err(res, 404, 'Product not found');
    if (!product.inStock)  return err(res, 400, 'Product is out of stock');

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      // First item ever — create a new cart
      cart = new Cart({
        userId,
        items: [{
          productId,
          name:     product.title,
          slug:     product.slug,
          image:    product.images?.[0] || '',
          price:    product.price,
          quantity: qty
        }]
      });
    } else {
      const existing = cart.items.find(i => i.productId.toString() === productId.toString());

      if (existing) {
        // Already in cart → bump quantity (capped at 99)
        existing.quantity = Math.min(existing.quantity + qty, 99);
      } else {
        // New item → push
        cart.items.push({
          productId,
          name:     product.title,
          slug:     product.slug,
          image:    product.images?.[0] || '',
          price:    product.price,
          quantity: qty
        });
      }
    }

    await cart.save();

    const addedItem = cart.items.find(i => i.productId.toString() === productId.toString());

    return res.status(200).json({
      success: true,
      count:   cart.totalItems,          // virtual on your schema
      addedItem: {
        productId: addedItem.productId,
        name:      addedItem.name,
        slug:      addedItem.slug,
        image:     addedItem.image,
        price:     addedItem.price,
        quantity:  addedItem.quantity
      }
    });

  } catch (e) {
    console.error('[addToCart]', e);
    return err(res, 500, 'Server error');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/cart/remove
// Body: { productId }
// ─────────────────────────────────────────────────────────────
exports.removeFromCart = async (req, res) => {
  try {
    const userId    = req.user.id;
    const { productId } = req.body;

    if (!productId) return err(res, 400, 'productId is required');

    const cart = await Cart.findOne({ userId });
    if (!cart) return err(res, 404, 'Cart not found');

    const before = cart.items.length;
    cart.items = cart.items.filter(i => i.productId.toString() !== productId.toString());

    if (cart.items.length === before) {
      return err(res, 404, 'Item not found in cart');
    }

    await cart.save();

    return res.status(200).json({
      success: true,
      count:   cart.totalItems
    });

  } catch (e) {
    console.error('[removeFromCart]', e);
    return err(res, 500, 'Server error');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/cart/update
// Body: { productId, quantity }
// If quantity <= 0 the item is removed automatically
// ─────────────────────────────────────────────────────────────
exports.updateCartItem = async (req, res) => {
  try {
    const userId              = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId) return err(res, 400, 'productId is required');

    const qty = parseInt(quantity, 10);
    if (!Number.isFinite(qty)) return err(res, 400, 'quantity must be a number');

    const cart = await Cart.findOne({ userId });
    if (!cart) return err(res, 404, 'Cart not found');

    const item = cart.items.find(i => i.productId.toString() === productId.toString());
    if (!item) return err(res, 404, 'Item not found in cart');

    if (qty <= 0) {
      // Treat as remove
      cart.items = cart.items.filter(i => i.productId.toString() !== productId.toString());
    } else {
      item.quantity = Math.min(qty, 99);
    }

    await cart.save();

    return res.status(200).json({
      success:  true,
      count:    cart.totalItems,
      quantity: qty <= 0 ? 0 : item.quantity
    });

  } catch (e) {
    console.error('[updateCartItem]', e);
    return err(res, 500, 'Server error');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/cart/count
// Returns total item count for the navbar badge
// ─────────────────────────────────────────────────────────────
exports.getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).lean();

    // lean() doesn't give virtuals, so compute manually
    const count = cart
      ? cart.items.reduce((sum, i) => sum + i.quantity, 0)
      : 0;

    return res.status(200).json({ success: true, count });

  } catch (e) {
    console.error('[getCartCount]', e);
    return err(res, 500, 'Server error');
  }
};


