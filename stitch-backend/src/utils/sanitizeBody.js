const DANGEROUS_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Safely extracts allowed fields from a source object, preventing prototype pollution.
 * @param {string[]} allowedFields Array of allowed keys.
 * @param {Object} body The object to sanitize (usually req.body).
 * @returns {Object} A new sanitized object.
 */
function sanitizeBody(allowedFields, body) {
  const sanitized = {};
  if (!body || typeof body !== 'object') return sanitized;

  allowedFields.forEach((key) => {
    // 1. Block dangerous keys
    if (DANGEROUS_KEYS.includes(key)) return;

    // 2. Verify the key exists as an own property on the target object
    if (Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined) {
      sanitized[key] = body[key];
    }
  });

  return sanitized;
}

module.exports = sanitizeBody;
