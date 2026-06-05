const express = require("express");

const userRoutes = require("../modules/users/user.routes");
const sellerRoutes = require("../modules/sellers/seller.routes");
const productRoutes = require("../modules/products/product.routes");
const shippingRoutes = require("./shippingRoutes");
const orderRoutes = require("../modules/orders/order.routes");
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
