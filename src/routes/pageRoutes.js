const express = require("express");
const { home, dashboard , addressDashboard } = require("../controllers/pageController");
const { requireAuth, requireVerified } = require("../middlewares/auth");

const router = express.Router();

router.get("/",  home);
router.get("/dashboard", requireAuth, requireVerified, dashboard);




module.exports = router;
