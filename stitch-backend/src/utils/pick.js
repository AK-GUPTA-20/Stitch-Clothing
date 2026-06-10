/**
 * Safely extracts only the allowed keys from a source object.
 * @param {Object} object - The source object (e.g., req.body)
 * @param {string[]} keys - Array of allowed field names
 * @returns {Object} A new object containing only the allowed fields
 */
const pick = (object, keys) => {
  return keys.reduce((obj, key) => {
    if (object && Object.prototype.hasOwnProperty.call(object, key)) {
      obj[key] = object[key];
    }
    return obj;
  }, {});
};

module.exports = pick;
