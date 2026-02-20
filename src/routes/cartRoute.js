const router = require("express").Router();
const { requireAuth, requireVerified } = require("../middlewares/auth.js");
const cart = require("../controllers/cartController.js");

router.get("/count", requireAuth, requireVerified, cart.getCount);
router.post("/add", requireAuth, requireVerified, cart.add);
router.patch("/qty", requireAuth, requireVerified, cart.updateQuantity);

router.get('/count', requireAuth, requireVerified, cart.getCartCount);
router.post('/add', requireAuth, requireVerified, cart.addToCart);
router.post('/remove', requireAuth, requireVerified, cart.removeFromCart);
router.post('/update', requireAuth, requireVerified, cart.updateCartItem);

module.exports = router;
