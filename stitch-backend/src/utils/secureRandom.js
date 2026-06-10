const crypto = require("crypto");

/**
 * Generates a cryptographically secure random hex string.
 * Used as a safe replacement for Math.random() (CWE-330).
 * 
 * @param {number} bytes - The number of random bytes to generate
 * @returns {string} Hex string representation
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString("hex");
};

module.exports = {
  generateSecureToken
};
