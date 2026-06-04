"use strict";

const { Schema } = require("mongoose");

const addressSchema = new Schema(
  {
    label         : { type: String, trim: true },
    type          : {
      type    : String,
      enum    : ["shipping", "billing", "pickup", "both"],
      default : "shipping",
    },
    recipientName : { type: String, trim: true },
    phone         : { type: String, trim: true },
    alternatePhone: { type: String, trim: true },
    line1         : { type: String, required: true, trim: true },
    line2         : { type: String, trim: true },
    landmark      : { type: String, trim: true },
    city          : { type: String, required: true, trim: true },
    district      : { type: String, trim: true },
    state         : { type: String, required: true, trim: true },
    postalCode    : { type: String, required: true, trim: true },
    country       : { type: String, required: true, default: "IN", trim: true, uppercase: true },
    gstin         : { type: String, trim: true },
    isDefault     : { type: Boolean, default: false },
    isVerified    : { type: Boolean, default: false },
    latitude      : { type: Number },
    longitude     : { type: Number },
  },
  { _id: true },
);

const moneySchema = new Schema(
  {
    amount   : { type: Number, required: true },
    currency : { type: String, default: "INR", uppercase: true, trim: true, maxlength: 3 },
  },
  { _id: false },
);

const imageSchema = new Schema(
  {
    url       : { type: String, required: true },
    alt       : { type: String, trim: true },
    position  : { type: Number, default: 0 },
    isDefault : { type: Boolean, default: false },
    width     : { type: Number },
    height    : { type: Number },
    mimeType  : { type: String },
    fileSize  : { type: Number },
  },
  { _id: true },
);

const statusHistorySchema = new Schema(
  {
    status    : { type: String, required: true },
    note      : { type: String, trim: true },
    location  : { type: String, trim: true },
    updatedBy : { type: Schema.Types.ObjectId, ref: "User" },
    role      : { type: String, enum: ["user", "seller", "admin", "system", "courier"] },
    timestamp : { type: Date, default: Date.now },
  },
  { 
    _id: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  },
);

statusHistorySchema.virtual("updatedAt").get(function () {
  return this.timestamp;
});

module.exports = {
  addressSchema,
  moneySchema,
  imageSchema,
  statusHistorySchema,
};