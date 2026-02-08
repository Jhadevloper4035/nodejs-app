const router = require("express").Router();
const { requireAuth, requireVerified } = require("../middlewares/auth");

const {
  getAllAddresses,
  createMyAddress,
  updateMyAddress,
  deleteMyAddress,
  setDefaultAddress,
} = require("../controllers/addressController.js");


router.get("/", requireAuth, requireVerified, getAllAddresses);
router.post("/", requireAuth, requireVerified, createMyAddress);
router.patch("/:addressId", requireAuth, requireVerified, updateMyAddress);
router.delete("/:addressId", requireAuth, requireVerified, deleteMyAddress);
router.patch("/:addressId/default", requireAuth, requireVerified, setDefaultAddress);

module.exports = router;