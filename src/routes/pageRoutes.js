const express = require("express");
const { home, dashboard, shopCollection, shopCollectionBySlug, shopCollectionBySubcategorySlug, shopproducts, cartPage, checkoutPage } = require("../controllers/pageController");
const { requireAuth, requireVerified } = require("../middlewares/auth");


const router = express.Router();

router.get("/", home);
router.get("/shop", shopCollection);

//catgeory 
router.get("/shop/:categorySlug", shopCollectionBySlug);
router.get("/shop/:categorySlug/:subcategoryslug", shopCollectionBySubcategorySlug);

// products
router.get("/products/:productSlug", shopproducts);
router.get("/dashboard", requireAuth, requireVerified, dashboard);

//cart

router.get("/cart", requireAuth, requireVerified, cartPage)
router.get("/checkout" , requireAuth, requireVerified, checkoutPage )


module.exports = router;
