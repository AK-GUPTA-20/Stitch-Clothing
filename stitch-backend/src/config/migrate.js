"use strict";

require("dotenv").config({ path: require("path").resolve(__dirname, "../../.env") });
const Product = require("../models/Product");
const Order = require("../models/Order");
const Seller = require("../models/Seller");
const mongoose = require("mongoose");

async function runMigration() {
  try {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGO_URI);
    }
    console.log("=====================================");
    console.log("🔍 Running database migrations/cleanup...");
    
    // 1. Migrate Products with User ID as sellerId to Seller ID
    const products = await Product.find({ deletedAt: null });
    let productCount = 0;
    for (const product of products) {
      if (!product.sellerId) continue;
      
      // Check if sellerId matches a Seller _id
      const sellerById = await Seller.findById(product.sellerId);
      if (!sellerById) {
        // Not a Seller _id. Try finding Seller by userId
        const sellerByUser = await Seller.findOne({ userId: product.sellerId });
        if (sellerByUser) {
          console.log(`Migrating product ${product.name} (${product._id}): sellerId ${product.sellerId} -> ${sellerByUser._id}`);
          product.sellerId = sellerByUser._id;
          await product.save({ validateBeforeSave: false });
          productCount++;
        }
      }
    }
    if (productCount > 0) {
      console.log(`✅ Migrated ${productCount} products' sellerId to their Seller document _id`);
    } else {
      console.log("ℹ️ No product sellerId mismatches found.");
    }

    // 2. Migrate Orders with User ID as sellerId to Seller ID
    const orders = await Order.find({});
    let orderCount = 0;
    for (const order of orders) {
      if (!order.sellerId) continue;
      
      // Check if sellerId matches a Seller _id
      const sellerById = await Seller.findById(order.sellerId);
      if (!sellerById) {
        // Not a Seller _id. Try finding Seller by userId
        const sellerByUser = await Seller.findOne({ userId: order.sellerId });
        if (sellerByUser) {
          console.log(`Migrating order ${order.orderId} (${order._id}): sellerId ${order.sellerId} -> ${sellerByUser._id}`);
          order.sellerId = sellerByUser._id;
          
          // Also update items sellerId
          if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
              if (item.sellerId && item.sellerId.toString() === sellerByUser.userId.toString()) {
                item.sellerId = sellerByUser._id;
              }
            });
          }
          await order.save({ validateBeforeSave: false });
          orderCount++;
        }
      }
    }
    if (orderCount > 0) {
      console.log(`✅ Migrated ${orderCount} orders' sellerId to their Seller document _id`);
    } else {
      console.log("ℹ️ No order sellerId mismatches found.");
    }

    console.log("🚀 Database migration/cleanup finished.");
    console.log("=====================================");
  } catch (error) {
    console.error("❌ Migration error:", error);
  } finally {
    if (require.main === module) {
      await mongoose.disconnect();
      process.exit(0);
    }
  }
}

if (require.main === module) {
  runMigration();
}

module.exports = runMigration;
