const express = require("express");
const { requireAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/api/protected", requireAuth, (req, res) => {
  res.json({ ok: true, message: "You are authenticated!", user: req.user, ts: Date.now() });
});

module.exports = router;
