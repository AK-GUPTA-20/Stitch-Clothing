"use strict";

const mongoose = require("mongoose");
const { Schema, model } = mongoose;
const { addressSchema, statusHistorySchema } = require("./shared");

const rateSlabSchema = new Schema(
  {
    courier      : {
      type : String,
      enum : ["dtdc", "bluedart", "delhivery", "shiprocket", "fedex", "ecom_express", "xpressbees", "shadowfax"],
    },
    minWeight    : { type: Number, required: true, min: 0 },
    maxWeight    : { type: Number, required: true },
    weightUnit   : { type: String, enum: ["g", "kg"], default: "g" },
    baseCharge   : { type: Number, required: true, min: 0 },
    perKgCharge  : { type: Number, default: 0 },
    fuelSurcharge: { type: Number, default: 0 },
    estimatedDays: {
      min : { type: Number, default: 2 },
      max : { type: Number, default: 7 },
    },
    isActive     : { type: Boolean, default: true },
  },
  { _id: true },
);

const regionSchema = new Schema(
  {
    country          : { type: String, required: true, default: "IN" },
    states           : [{ type: String }],
    zones            : [{ type: String }],
    pincodes         : [{ type: String }],
    excludedPincodes : [{ type: String }],
    isActive         : { type: Boolean, default: true },
  },
  { _id: false },
);

const courierIntegrationSchema = new Schema(
  {
    provider      : {
      type     : String,
      enum     : ["shiprocket", "delhivery", "dtdc", "ecom_express", "bluedart", "fedex", "pickrr"],
      required : true,
    },
    apiKey        : { type: String, select: false },
    apiSecret     : { type: String, select: false },
    webhookSecret : { type: String, select: false },
    accountId     : { type: String },
    isActive      : { type: Boolean, default: false },
    isSandbox     : { type: Boolean, default: true },
    lastTestedAt  : { type: Date },
  },
  { _id: true },
);

const shipmentSchema = new Schema(
  {
    orderId         : { type: String, required: true },
    sellerId        : { type: Schema.Types.ObjectId, ref: "Seller", required: true },
    userId          : { type: Schema.Types.ObjectId, ref: "User", required: true },
    courier         : { type: String },
    awb             : { type: String },
    labelUrl        : { type: String },
    invoiceUrl      : { type: String },
    courierOrderId  : { type: String },
    status          : {
      type    : String,
      enum    : ["label_created", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "delivered", "delivery_failed", "rto_initiated", "rto_delivered"],
      default : "label_created",
    },
    statusHistory   : { type: [statusHistorySchema], default: [] },
    pickupDate        : { type: Date },
    estimatedDelivery : { type: Date },
    deliveredAt       : { type: Date },
    weight            : { type: Number },
    dimensions        : { length: Number, width: Number, height: Number },
    packageCount      : { type: Number, default: 1 },
    deliveryAddress   : { type: addressSchema },
    isCOD             : { type: Boolean, default: false },
    codAmount         : { type: Number, default: 0 },
    createdAt         : { type: Date, default: Date.now },
  },
  { _id: true },
);

const shippingSchema = new Schema(
  {
    name        : { type: String, required: true, trim: true },
    code        : { type: String, required: true, unique: true, uppercase: true, trim: true },
    description : { type: String },
    isDefault   : { type: Boolean, default: false },
    isActive    : { type: Boolean, default: true },
    regions             : { type: [regionSchema], default: [] },
    blacklistedPincodes : [{ type: String }],
    rateSlabs             : { type: [rateSlabSchema], default: [] },
    freeShippingThreshold : { type: Number, min: 0 },
    expressShipping : {
      available       : { type: Boolean, default: false },
      charge          : { type: Number, default: 0 },
      estimatedDays   : { min: Number, max: Number },
      cutoffTime      : { type: String },
    },
    isCODAvailable   : { type: Boolean, default: true },
    codChargeType    : { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    codCharge        : { type: Number, default: 0 },
    maxCODOrderValue : { type: Number, min: 0 },
    priorityCouriers : [{ type: String }],
    integrations     : { type: [courierIntegrationSchema], default: [] },
    shipments : { type: [shipmentSchema], default: [] },
  },
  { timestamps: true },
);

shippingSchema.index({ "regions.country": 1 });
shippingSchema.index({ "regions.pincodes": 1 });
shippingSchema.index({ isActive: 1 });
shippingSchema.index({ "shipments.orderId": 1 });
shippingSchema.index({ "shipments.awb": 1 });

const Shipping = model("Shipping", shippingSchema);

module.exports = Shipping;