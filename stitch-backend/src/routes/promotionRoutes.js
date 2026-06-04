const express = require("express");
const { createPromotion, getPromotions, getPromotionById, updatePromotion, deletePromotion } = require("../controllers/promotionController");
const { isAuthenticated, isAdmin } = require("../middleware/auth");

const router = express.Router();

router.route("/")
  .post(isAuthenticated, isAdmin, createPromotion)
  .get(getPromotions);

router.route("/:id")
  .get(getPromotionById)
  .put(isAuthenticated, isAdmin, updatePromotion)
  .delete(isAuthenticated, isAdmin, deletePromotion);

module.exports = router;
