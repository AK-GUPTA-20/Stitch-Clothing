const express = require("express");

const userRoutes = require("./userRoutes");
const sellerRoutes = require("./sellerRoutes");
const productRoutes = require("./productRoutes");
const shippingRoutes = require("./shippingRoutes");
const orderRoutes = require("./orderRoutes");
const promotionRoutes = require("./promotionRoutes");
const configRoutes = require("./configRoutes");

const router = express.Router();

router.use("/user", userRoutes);
router.use("/sellers", sellerRoutes);
router.use("/products", productRoutes);
router.use("/shipping", shippingRoutes);
router.use("/orders", orderRoutes);
router.use("/promotions", promotionRoutes);
router.use("/configs", configRoutes);

module.exports = router;
