"use strict";

const catchAsyncError = require("../middleware/catchAsyncError");
const ErrorHandler    = require("../middleware/error");
const Shipping        = require("../models/Shipping");

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */

/** Check if a pincode falls in a region and is not blacklisted */
function _isPincodeServiceable(profile, pincode) {
  if (profile.blacklistedPincodes.includes(pincode)) return false;

  if (!profile.regions.length) return profile.isActive;

  return profile.regions.some((r) => {
    if (!r.isActive) return false;
    if (r.excludedPincodes.includes(pincode)) return false;
    return r.pincodes.length === 0 || r.pincodes.includes(pincode);
  });
}

/** Calculate shipping cost for given weight (grams) against a profile's rate slabs */
function _calculateCost(profile, weightGrams) {
  const active = profile.rateSlabs.filter((s) => s.isActive);
  if (!active.length) return null;

  for (const slab of active) {
    const slabMinG = slab.weightUnit === "kg" ? slab.minWeight * 1000 : slab.minWeight;
    const slabMaxG = slab.weightUnit === "kg" ? slab.maxWeight * 1000 : slab.maxWeight;

    if (weightGrams >= slabMinG && weightGrams <= slabMaxG) {
      const extraKg  = Math.max(0, (weightGrams / 1000) - (slabMinG / 1000));
      const charge   = slab.baseCharge + extraKg * slab.perKgCharge + slab.fuelSurcharge;
      return {
        courier       : slab.courier,
        charge        : Math.round(charge * 100) / 100,
        estimatedDays : slab.estimatedDays,
      };
    }
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────────────────────────────────────── */

//* Get all active shipping profiles with optional filters  GET /api/v1/shipping
exports.getShippingProfiles = catchAsyncError(async (req, res) => {
  const { isCODAvailable, isDefault, page = 1, limit = 20 } = req.query;

  const filter = { isActive: true };
  if (isCODAvailable !== undefined) filter.isCODAvailable = isCODAvailable === "true";
  if (isDefault      !== undefined) filter.isDefault      = isDefault      === "true";

  const skip = (Number(page) - 1) * Number(limit);

  const [profiles, total] = await Promise.all([
    Shipping.find(filter)
      .select("-shipments -integrations")
      .sort({ isDefault: -1, createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Shipping.countDocuments(filter),
  ]);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    count   : profiles.length,
    data    : profiles,
  });
});

//* Get a single shipping profile by ID  GET /api/v1/shipping/:id
exports.getShippingProfileById = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("-shipments -integrations");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  res.status(200).json({ success: true, data: shipping });
});

//* Check if a pincode is serviceable under any active shipping profile  GET /api/v1/shipping/check-pincode
exports.checkPincodeAvailability = catchAsyncError(async (req, res, next) => {
  const { pincode } = req.query;
  if (!pincode) return next(new ErrorHandler("pincode query param is required.", 400));

  const profiles = await Shipping.find({ isActive: true }).select("name code regions blacklistedPincodes isCODAvailable");

  const results = profiles.map((p) => ({
    profileId     : p._id,
    profileName   : p.name,
    profileCode   : p.code,
    isServiceable : _isPincodeServiceable(p, pincode),
    isCODAvailable: p.isCODAvailable,
  }));

  const isServiceable = results.some((r) => r.isServiceable);

  res.status(200).json({
    success       : true,
    pincode,
    isServiceable,
    profiles      : results.filter((r) => r.isServiceable),
  });
});

//* Estimate shipping cost for a given weight and pincode  GET /api/v1/shipping/estimate
exports.estimateShippingCost = catchAsyncError(async (req, res, next) => {
  const { pincode, weightGrams, orderAmount } = req.query;

  if (!pincode || !weightGrams) {
    return next(new ErrorHandler("pincode and weightGrams are required.", 400));
  }

  const weight   = parseFloat(weightGrams);
  const amount   = parseFloat(orderAmount) || 0;
  const profiles = await Shipping.find({ isActive: true }).select(
    "name code regions blacklistedPincodes rateSlabs freeShippingThreshold expressShipping isCODAvailable codCharge codChargeType maxCODOrderValue"
  );

  const estimates = [];

  for (const profile of profiles) {
    if (!_isPincodeServiceable(profile, pincode)) continue;

    const rate = _calculateCost(profile, weight);
    if (!rate) continue;

    const isFreeShipping = profile.freeShippingThreshold && amount >= profile.freeShippingThreshold;
    const shippingCharge = isFreeShipping ? 0 : rate.charge;

    const codCharge =
      profile.isCODAvailable
        ? profile.codChargeType === "percentage"
          ? Math.round(amount * (profile.codCharge / 100) * 100) / 100
          : profile.codCharge
        : null;

    const estimate = {
      profileId     : profile._id,
      profileName   : profile.name,
      courier       : rate.courier,
      shippingCharge,
      isFreeShipping,
      estimatedDays : rate.estimatedDays,
      isCODAvailable: profile.isCODAvailable && (!profile.maxCODOrderValue || amount <= profile.maxCODOrderValue),
      codCharge,
    };

    if (profile.expressShipping?.available) {
      estimate.express = {
        charge        : profile.expressShipping.charge,
        estimatedDays : profile.expressShipping.estimatedDays,
        cutoffTime    : profile.expressShipping.cutoffTime,
      };
    }

    estimates.push(estimate);
  }

  res.status(200).json({ success: true, pincode, weightGrams: weight, estimates });
});

//* Track a shipment by AWB number  GET /api/v1/shipping/track/:awb
exports.trackShipmentByAWB = catchAsyncError(async (req, res, next) => {
  const profile = await Shipping.findOne({ "shipments.awb": req.params.awb })
    .select("shipments.$ name code");

  if (!profile || !profile.shipments.length) {
    return next(new ErrorHandler("Shipment not found for AWB.", 404));
  }

  const shipment = profile.shipments[0];

  res.status(200).json({ success: true, data: shipment });
});

//* Get shipment details by order ID  GET /api/v1/shipping/order/:orderId
exports.getShipmentByOrderId = catchAsyncError(async (req, res, next) => {
  const profile = await Shipping.findOne({ "shipments.orderId": req.params.orderId })
    .select("name code shipments");

  if (!profile) return next(new ErrorHandler("Shipment not found for this order.", 404));

  const shipment = profile.shipments.find((s) => s.orderId === req.params.orderId);
  if (!shipment) return next(new ErrorHandler("Shipment not found.", 404));

  res.status(200).json({ success: true, data: shipment });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — PROFILE CRUD
───────────────────────────────────────────────────────────────────────────── */

//* Create a new shipping profile  POST /api/v1/shipping
exports.createShippingProfile = catchAsyncError(async (req, res, next) => {
  const exists = await Shipping.findOne({ code: req.body.code?.toUpperCase() });
  if (exists) return next(new ErrorHandler(`Shipping profile code "${req.body.code}" already exists.`, 409));

  if (req.body.isDefault) {
    await Shipping.updateMany({}, { $set: { isDefault: false } });
  }

  const shipping = await Shipping.create(req.body);

  res.status(201).json({ success: true, data: shipping });
});

//* Update core fields of a shipping profile  PUT /api/v1/shipping/:id
exports.updateShippingProfile = catchAsyncError(async (req, res, next) => {
  const PROTECTED = ["rateSlabs", "regions", "integrations", "shipments", "blacklistedPincodes"];
  PROTECTED.forEach((f) => delete req.body[f]);

  if (req.body.isDefault) {
    await Shipping.updateMany({ _id: { $ne: req.params.id } }, { $set: { isDefault: false } });
  }

  const shipping = await Shipping.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true, runValidators: true }
  ).select("-shipments");

  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  res.status(200).json({ success: true, data: shipping });
});

//* Soft-delete a shipping profile  DELETE /api/v1/shipping/:id
exports.deleteShippingProfile = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id);
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  if (shipping.isDefault) return next(new ErrorHandler("Cannot delete the default shipping profile.", 400));

  shipping.isActive = false;
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: "Shipping profile deactivated." });
});

//* Set a profile as the platform default  PATCH /api/v1/shipping/:id/default
exports.setDefaultProfile = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id);
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));
  if (!shipping.isActive) return next(new ErrorHandler("Cannot set an inactive profile as default.", 400));

  await Shipping.updateMany({}, { $set: { isDefault: false } });
  shipping.isDefault = true;
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: `"${shipping.name}" is now the default profile.` });
});

//* Toggle a shipping profile active or inactive  PATCH /api/v1/shipping/:id/toggle
exports.toggleShippingProfile = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id);
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));
  if (shipping.isDefault && shipping.isActive) {
    return next(new ErrorHandler("Cannot deactivate the default shipping profile.", 400));
  }

  shipping.isActive = !shipping.isActive;
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, isActive: shipping.isActive });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — REGIONS
───────────────────────────────────────────────────────────────────────────── */

//* Get all coverage regions for a shipping profile  GET /api/v1/shipping/:id/regions
exports.getRegions = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("regions blacklistedPincodes name");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  res.status(200).json({ success: true, regions: shipping.regions, blacklistedPincodes: shipping.blacklistedPincodes });
});

//* Add a coverage region to a shipping profile  POST /api/v1/shipping/:id/regions
exports.addRegion = catchAsyncError(async (req, res, next) => {
  const { country = "IN", states, zones, pincodes, excludedPincodes } = req.body;

  const shipping = await Shipping.findById(req.params.id).select("regions");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  shipping.regions.push({ country, states: states || [], zones: zones || [], pincodes: pincodes || [], excludedPincodes: excludedPincodes || [] });
  await shipping.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, regions: shipping.regions });
});

//* Update a region by array index  PUT /api/v1/shipping/:id/regions/:index
exports.updateRegion = catchAsyncError(async (req, res, next) => {
  const idx      = parseInt(req.params.index, 10);
  const shipping = await Shipping.findById(req.params.id).select("regions");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));
  if (isNaN(idx) || idx < 0 || idx >= shipping.regions.length) {
    return next(new ErrorHandler(`Region at index ${idx} not found.`, 404));
  }

  const ALLOWED = ["country", "states", "zones", "pincodes", "excludedPincodes", "isActive"];
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) shipping.regions[idx][f] = req.body[f]; });

  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, regions: shipping.regions });
});

//* Remove a region by array index  DELETE /api/v1/shipping/:id/regions/:index
exports.removeRegion = catchAsyncError(async (req, res, next) => {
  const idx      = parseInt(req.params.index, 10);
  const shipping = await Shipping.findById(req.params.id).select("regions");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));
  if (isNaN(idx) || idx < 0 || idx >= shipping.regions.length) {
    return next(new ErrorHandler(`Region at index ${idx} not found.`, 404));
  }

  shipping.regions.splice(idx, 1);
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, regions: shipping.regions });
});

//* Add or remove pincodes from the blacklist  PATCH /api/v1/shipping/:id/blacklist
exports.updateBlacklist = catchAsyncError(async (req, res, next) => {
  const { add = [], remove = [] } = req.body;

  if (!Array.isArray(add) || !Array.isArray(remove)) {
    return next(new ErrorHandler("add and remove must be arrays of pincode strings.", 400));
  }

  const shipping = await Shipping.findById(req.params.id).select("blacklistedPincodes");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const current = new Set(shipping.blacklistedPincodes);
  add.forEach((p) => current.add(String(p)));
  remove.forEach((p) => current.delete(String(p)));

  shipping.blacklistedPincodes = [...current];
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, blacklistedPincodes: shipping.blacklistedPincodes });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — RATE SLABS
───────────────────────────────────────────────────────────────────────────── */

//* Get all rate slabs for a shipping profile  GET /api/v1/shipping/:id/rates
exports.getRateSlabs = catchAsyncError(async (req, res, next) => {
  const { courier, isActive } = req.query;

  const shipping = await Shipping.findById(req.params.id).select("rateSlabs name");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  let slabs = shipping.rateSlabs;
  if (courier)   slabs = slabs.filter((s) => s.courier === courier);
  if (isActive !== undefined) slabs = slabs.filter((s) => s.isActive === (isActive === "true"));

  res.status(200).json({ success: true, count: slabs.length, data: slabs });
});

//* Add a new rate slab to a shipping profile  POST /api/v1/shipping/:id/rates
exports.addRateSlab = catchAsyncError(async (req, res, next) => {
  if (req.body.minWeight === undefined || req.body.maxWeight === undefined || req.body.baseCharge === undefined) {
    return next(new ErrorHandler("minWeight, maxWeight and baseCharge are required.", 400));
  }

  const shipping = await Shipping.findById(req.params.id).select("rateSlabs");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  // Detect weight range overlap for same courier
  const overlaps = shipping.rateSlabs.some((s) => {
    if (s.courier !== req.body.courier) return false;
    return req.body.minWeight < s.maxWeight && req.body.maxWeight > s.minWeight;
  });
  if (overlaps) return next(new ErrorHandler("Weight range overlaps with an existing slab for this courier.", 409));

  shipping.rateSlabs.push(req.body);
  await shipping.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, rateSlabs: shipping.rateSlabs });
});

//* Update an existing rate slab  PUT /api/v1/shipping/:id/rates/:slabId
exports.updateRateSlab = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("rateSlabs");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const slab = shipping.rateSlabs.id(req.params.slabId);
  if (!slab) return next(new ErrorHandler("Rate slab not found.", 404));

  const ALLOWED = ["courier", "minWeight", "maxWeight", "weightUnit", "baseCharge", "perKgCharge", "fuelSurcharge", "estimatedDays"];
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) slab[f] = req.body[f]; });

  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, rateSlabs: shipping.rateSlabs });
});

//* Toggle a rate slab active or inactive  PATCH /api/v1/shipping/:id/rates/:slabId/toggle
exports.toggleRateSlab = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("rateSlabs");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const slab = shipping.rateSlabs.id(req.params.slabId);
  if (!slab) return next(new ErrorHandler("Rate slab not found.", 404));

  slab.isActive = !slab.isActive;
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, slabId: slab._id, isActive: slab.isActive });
});

//* Delete a rate slab  DELETE /api/v1/shipping/:id/rates/:slabId
exports.deleteRateSlab = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("rateSlabs");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const slab = shipping.rateSlabs.id(req.params.slabId);
  if (!slab) return next(new ErrorHandler("Rate slab not found.", 404));

  shipping.rateSlabs.pull({ _id: req.params.slabId });
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, rateSlabs: shipping.rateSlabs });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — EXPRESS & COD
───────────────────────────────────────────────────────────────────────────── */

//* Update express shipping configuration  PATCH /api/v1/shipping/:id/express
exports.updateExpressShipping = catchAsyncError(async (req, res, next) => {
  const { available, charge, estimatedDays, cutoffTime } = req.body;

  const updates = {};
  if (available      !== undefined) updates["expressShipping.available"]      = available;
  if (charge         !== undefined) updates["expressShipping.charge"]         = charge;
  if (estimatedDays  !== undefined) updates["expressShipping.estimatedDays"]  = estimatedDays;
  if (cutoffTime     !== undefined) updates["expressShipping.cutoffTime"]     = cutoffTime;

  const shipping = await Shipping.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("expressShipping name");

  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  res.status(200).json({ success: true, expressShipping: shipping.expressShipping });
});

//* Update COD rules for a shipping profile  PATCH /api/v1/shipping/:id/cod
exports.updateCODSettings = catchAsyncError(async (req, res, next) => {
  const { isCODAvailable, codChargeType, codCharge, maxCODOrderValue } = req.body;

  const updates = {};
  if (isCODAvailable   !== undefined) updates.isCODAvailable   = isCODAvailable;
  if (codChargeType    !== undefined) updates.codChargeType    = codChargeType;
  if (codCharge        !== undefined) updates.codCharge        = codCharge;
  if (maxCODOrderValue !== undefined) updates.maxCODOrderValue = maxCODOrderValue;

  const shipping = await Shipping.findByIdAndUpdate(
    req.params.id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select("isCODAvailable codChargeType codCharge maxCODOrderValue name");

  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  res.status(200).json({ success: true, cod: { isCODAvailable: shipping.isCODAvailable, codChargeType: shipping.codChargeType, codCharge: shipping.codCharge, maxCODOrderValue: shipping.maxCODOrderValue } });
});

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — COURIER INTEGRATIONS
───────────────────────────────────────────────────────────────────────────── */

//* Get all courier integrations (secrets masked)  GET /api/v1/shipping/:id/integrations
exports.getIntegrations = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("integrations name");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const safe = shipping.integrations.map((i) => {
    const obj = i.toObject();
    delete obj.apiKey; delete obj.apiSecret; delete obj.webhookSecret;
    return obj;
  });

  res.status(200).json({ success: true, count: safe.length, data: safe });
});

//* Add a new courier integration  POST /api/v1/shipping/:id/integrations
exports.addIntegration = catchAsyncError(async (req, res, next) => {
  if (!req.body.provider) return next(new ErrorHandler("provider is required.", 400));

  const shipping = await Shipping.findById(req.params.id).select("integrations");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const exists = shipping.integrations.some((i) => i.provider === req.body.provider);
  if (exists) return next(new ErrorHandler(`Integration for "${req.body.provider}" already exists.`, 409));

  shipping.integrations.push(req.body);
  await shipping.save({ validateBeforeSave: false });

  const added = shipping.integrations[shipping.integrations.length - 1].toObject();
  delete added.apiKey; delete added.apiSecret; delete added.webhookSecret;

  res.status(201).json({ success: true, data: added });
});

//* Update a courier integration's credentials or settings  PUT /api/v1/shipping/:id/integrations/:integrationId
exports.updateIntegration = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("integrations");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const integration = shipping.integrations.id(req.params.integrationId);
  if (!integration) return next(new ErrorHandler("Integration not found.", 404));

  const ALLOWED = ["apiKey", "apiSecret", "webhookSecret", "accountId", "isSandbox"];
  ALLOWED.forEach((f) => { if (req.body[f] !== undefined) integration[f] = req.body[f]; });

  await shipping.save({ validateBeforeSave: false });

  const out = integration.toObject();
  delete out.apiKey; delete out.apiSecret; delete out.webhookSecret;

  res.status(200).json({ success: true, data: out });
});

//* Toggle a courier integration active or inactive  PATCH /api/v1/shipping/:id/integrations/:integrationId/toggle
exports.toggleIntegration = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("integrations");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const integration = shipping.integrations.id(req.params.integrationId);
  if (!integration) return next(new ErrorHandler("Integration not found.", 404));

  integration.isActive = !integration.isActive;
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, provider: integration.provider, isActive: integration.isActive });
});

//* Ping integration to verify credentials are working  POST /api/v1/shipping/:id/integrations/:integrationId/test
exports.testIntegration = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("integrations");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const integration = shipping.integrations.id(req.params.integrationId);
  if (!integration) return next(new ErrorHandler("Integration not found.", 404));

  // TODO: call the provider SDK with integration.apiKey to verify
  integration.lastTestedAt = new Date();
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({
    success      : true,
    provider     : integration.provider,
    isSandbox    : integration.isSandbox,
    lastTestedAt : integration.lastTestedAt,
    message      : `Integration test for "${integration.provider}" recorded. Wire provider SDK to verify.`,
  });
});

//* Delete a courier integration  DELETE /api/v1/shipping/:id/integrations/:integrationId
exports.deleteIntegration = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("integrations");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const integration = shipping.integrations.id(req.params.integrationId);
  if (!integration) return next(new ErrorHandler("Integration not found.", 404));

  if (integration.isActive) return next(new ErrorHandler("Deactivate the integration before deleting it.", 400));

  shipping.integrations.pull({ _id: req.params.integrationId });
  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, message: `Integration "${integration.provider}" deleted.` });
});

/* ─────────────────────────────────────────────────────────────────────────────
   SHIPMENTS
───────────────────────────────────────────────────────────────────────────── */

//* Get paginated shipments for a profile with filters  GET /api/v1/shipping/:id/shipments
exports.getShipments = catchAsyncError(async (req, res, next) => {
  const { status, isCOD, from, to, page = 1, limit = 20 } = req.query;

  const shipping = await Shipping.findById(req.params.id).select("shipments name");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  let shipments = [...shipping.shipments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (status) shipments = shipments.filter((s) => s.status === status);
  if (isCOD  !== undefined) shipments = shipments.filter((s) => s.isCOD === (isCOD === "true"));
  if (from) shipments = shipments.filter((s) => new Date(s.createdAt) >= new Date(from));
  if (to)   shipments = shipments.filter((s) => new Date(s.createdAt) <= new Date(to));

  const total = shipments.length;
  const skip  = (Number(page) - 1) * Number(limit);

  res.status(200).json({
    success : true,
    total,
    page    : Number(page),
    pages   : Math.ceil(total / Number(limit)),
    data    : shipments.slice(skip, skip + Number(limit)),
  });
});

//* Create a shipment entry under a shipping profile  POST /api/v1/shipping/:id/shipments
exports.createShipment = catchAsyncError(async (req, res, next) => {
  const { orderId, sellerId, userId, courier, awb, weight, dimensions, deliveryAddress, isCOD, codAmount, pickupDate, estimatedDelivery } = req.body;

  if (!orderId || !sellerId || !userId) {
    return next(new ErrorHandler("orderId, sellerId and userId are required.", 400));
  }

  const shipping = await Shipping.findById(req.params.id).select("shipments isActive");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));
  if (!shipping.isActive) return next(new ErrorHandler("Cannot create shipment under an inactive profile.", 400));

  const duplicate = shipping.shipments.some((s) => s.orderId === orderId);
  if (duplicate) return next(new ErrorHandler(`Shipment for order "${orderId}" already exists.`, 409));

  const shipment = {
    orderId,
    sellerId,
    userId,
    courier,
    awb,
    weight,
    dimensions,
    deliveryAddress,
    isCOD           : isCOD    || false,
    codAmount        : codAmount || 0,
    pickupDate,
    estimatedDelivery,
    status           : "label_created",
    statusHistory    : [{ status: "label_created", timestamp: new Date(), role: "system" }],
    createdAt        : new Date(),
  };

  shipping.shipments.push(shipment);
  await shipping.save({ validateBeforeSave: false });

  res.status(201).json({ success: true, data: shipping.shipments[shipping.shipments.length - 1] });
});

//* Get a single shipment by ID  GET /api/v1/shipping/:id/shipments/:shipmentId
exports.getShipmentById = catchAsyncError(async (req, res, next) => {
  const shipping = await Shipping.findById(req.params.id).select("shipments name");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const shipment = shipping.shipments.id(req.params.shipmentId);
  if (!shipment) return next(new ErrorHandler("Shipment not found.", 404));

  res.status(200).json({ success: true, data: shipment });
});

//* Update shipment status and push to status history  PATCH /api/v1/shipping/:id/shipments/:shipmentId/status
exports.updateShipmentStatus = catchAsyncError(async (req, res, next) => {
  const { status, awb, labelUrl, invoiceUrl, courierOrderId, deliveredAt, pickupDate, estimatedDelivery } = req.body;

  const VALID = ["label_created", "pickup_scheduled", "picked_up", "in_transit", "out_for_delivery", "delivered", "delivery_failed", "rto_initiated", "rto_delivered"];
  if (!VALID.includes(status)) return next(new ErrorHandler(`Invalid shipment status "${status}".`, 400));

  const shipping = await Shipping.findById(req.params.id).select("shipments");
  if (!shipping) return next(new ErrorHandler("Shipping profile not found.", 404));

  const shipment = shipping.shipments.id(req.params.shipmentId);
  if (!shipment) return next(new ErrorHandler("Shipment not found.", 404));

  shipment.status = status;
  shipment.statusHistory.push({ status, timestamp: new Date(), role: "system" });

  if (awb)               shipment.awb               = awb;
  if (labelUrl)          shipment.labelUrl          = labelUrl;
  if (invoiceUrl)        shipment.invoiceUrl        = invoiceUrl;
  if (courierOrderId)    shipment.courierOrderId    = courierOrderId;
  if (pickupDate)        shipment.pickupDate        = new Date(pickupDate);
  if (estimatedDelivery) shipment.estimatedDelivery = new Date(estimatedDelivery);
  if (status === "delivered") shipment.deliveredAt  = deliveredAt ? new Date(deliveredAt) : new Date();

  await shipping.save({ validateBeforeSave: false });

  res.status(200).json({ success: true, data: shipment });
});