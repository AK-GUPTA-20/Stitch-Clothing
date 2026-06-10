const asyncHandler = require("./asyncHandler");
const ErrorHandler = require("./error");

/**
 * Middleware to verify that the requesting user owns the resource they are trying to access.
 * Admins are automatically bypassed.
 * 
 * @param {Model} Model - The Mongoose model (e.g. Order, Product)
 * @param {string} idParam - The req.params key containing the ID (e.g. 'id')
 * @param {string} ownerField - The field on the document referencing the user (e.g. 'userId', 'sellerId')
 */
const verifyOwnership = (Model, idParam = "id", ownerField = "userId") => 
  asyncHandler(async (req, res, next) => {
    // Admins have universal access
    if (req.user && req.user.role === "admin") {
      return next();
    }

    const docId = req.params[idParam];
    const document = await Model.findById(docId).select(ownerField).lean();

    if (!document) {
      return next(new ErrorHandler("Resource not found", 404));
    }

    // Verify Ownership
    if (document[ownerField].toString() !== req.user._id.toString()) {
      return next(new ErrorHandler("Forbidden: You do not have permission to access this resource", 403));
    }

    next();
  });

module.exports = verifyOwnership;
