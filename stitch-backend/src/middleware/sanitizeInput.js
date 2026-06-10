const pick = require("../utils/pick");

/**
 * Middleware to restrict req.body to only allowed fields.
 * Prevents Mass Assignment vulnerabilities at the route level.
 * 
 * @param {string[]} allowedFields - Array of allowed keys for this route
 */
const sanitizeUserInput = (allowedFields) => {
  return (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
      req.body = pick(req.body, allowedFields);
    }
    next();
  };
};

module.exports = sanitizeUserInput;
