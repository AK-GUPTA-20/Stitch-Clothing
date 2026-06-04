"use strict";

const express = require("express");
const {
  getShippingProfiles,
  getShippingProfileById,
  checkPincodeAvailability,
  estimateShippingCost,
  trackShipmentByAWB,
  getShipmentByOrderId,
  createShippingProfile,
  updateShippingProfile,
  deleteShippingProfile,
  setDefaultProfile,
  toggleShippingProfile,
  getRegions,
  addRegion,
  updateRegion,
  removeRegion,
  updateBlacklist,
  getRateSlabs,
  addRateSlab,
  updateRateSlab,
  toggleRateSlab,
  deleteRateSlab,
  updateExpressShipping,
  updateCODSettings,
  getIntegrations,
  addIntegration,
  updateIntegration,
  toggleIntegration,
  testIntegration,
  deleteIntegration,
  getShipments,
  createShipment,
  getShipmentById,
  updateShipmentStatus,
} = require("../controllers/shippingController");

const { isAuthenticated, isAdmin, isAuthorized } = require("../middleware/auth");

const router = express.Router();

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC
───────────────────────────────────────────────────────────────────────────── */

router.get( "/",                        getShippingProfiles       );
router.get( "/check-pincode",           checkPincodeAvailability  );
router.get( "/estimate",                estimateShippingCost      );
router.get( "/track/:awb",              trackShipmentByAWB        );
router.get( "/order/:orderId",          getShipmentByOrderId      );
router.get( "/:id",                     getShippingProfileById    );

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — PROFILE CRUD
───────────────────────────────────────────────────────────────────────────── */

router.post(   "/",                     isAuthenticated, isAdmin, createShippingProfile );
router.put(    "/:id",                  isAuthenticated, isAdmin, updateShippingProfile );
router.delete( "/:id",                  isAuthenticated, isAdmin, deleteShippingProfile );
router.patch(  "/:id/default",          isAuthenticated, isAdmin, setDefaultProfile     );
router.patch(  "/:id/toggle",           isAuthenticated, isAdmin, toggleShippingProfile );

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — REGIONS & BLACKLIST
───────────────────────────────────────────────────────────────────────────── */

router.route("/:id/regions")
  .get(  isAuthenticated, isAdmin, getRegions )
  .post( isAuthenticated, isAdmin, addRegion  );

router.route("/:id/regions/:index")
  .put(    isAuthenticated, isAdmin, updateRegion )
  .delete( isAuthenticated, isAdmin, removeRegion );

router.patch( "/:id/blacklist", isAuthenticated, isAdmin, updateBlacklist );

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — RATE SLABS
───────────────────────────────────────────────────────────────────────────── */

router.route("/:id/rates")
  .get(  isAuthenticated, isAdmin, getRateSlabs )
  .post( isAuthenticated, isAdmin, addRateSlab  );

router.route("/:id/rates/:slabId")
  .put(    isAuthenticated, isAdmin, updateRateSlab )
  .delete( isAuthenticated, isAdmin, deleteRateSlab );

router.patch( "/:id/rates/:slabId/toggle", isAuthenticated, isAdmin, toggleRateSlab );

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — EXPRESS & COD
───────────────────────────────────────────────────────────────────────────── */

router.patch( "/:id/express", isAuthenticated, isAdmin, updateExpressShipping );
router.patch( "/:id/cod",     isAuthenticated, isAdmin, updateCODSettings     );

/* ─────────────────────────────────────────────────────────────────────────────
   ADMIN — COURIER INTEGRATIONS
───────────────────────────────────────────────────────────────────────────── */

router.route("/:id/integrations")
  .get(  isAuthenticated, isAdmin, getIntegrations )
  .post( isAuthenticated, isAdmin, addIntegration  );

router.route("/:id/integrations/:integrationId")
  .put(    isAuthenticated, isAdmin, updateIntegration )
  .delete( isAuthenticated, isAdmin, deleteIntegration );

router.patch( "/:id/integrations/:integrationId/toggle", isAuthenticated, isAdmin, toggleIntegration );
router.post(  "/:id/integrations/:integrationId/test",   isAuthenticated, isAdmin, testIntegration   );

/* ─────────────────────────────────────────────────────────────────────────────
   SELLER + ADMIN — SHIPMENTS
───────────────────────────────────────────────────────────────────────────── */

router.route("/:id/shipments")
  .get(  isAuthenticated, isAuthorized(["seller", "admin"]), getShipments   )
  .post( isAuthenticated, isAuthorized(["seller", "admin"]), createShipment );

router.get(   "/:id/shipments/:shipmentId",        isAuthenticated, isAuthorized(["seller", "admin"]), getShipmentById      );
router.patch( "/:id/shipments/:shipmentId/status", isAuthenticated, isAuthorized(["seller", "admin"]), updateShipmentStatus );

module.exports = router;