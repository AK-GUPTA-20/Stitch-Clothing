const escapeStringRegexp = require('escape-string-regexp');

/**
 * Sanitizes user input for use in a Regular Expression (e.g., MongoDB $regex or new RegExp)
 * Prevents ReDoS (Regular Expression Denial of Service) CWE-1287, CWE-1333.
 * 
 * 1. Limits the string to a maximum length to prevent extremely long evaluation times
 * 2. Escapes all special RegExp characters (e.g. . * + ? ^ $ { } [ ] | ( ) \)
 *
 * @param {string} input - The unsanitized user input
 * @param {number} maxLength - Maximum allowed length (default: 100)
 * @returns {string} The safe, escaped string
 */
const sanitizeRegex = (input, maxLength = 100) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  // 1. Trim and slice to the maximum length to prevent ReDoS via long strings
  const trimmed = input.trim().slice(0, maxLength);
  
  // 2. Escape all special regex metacharacters
  return escapeStringRegexp(trimmed);
};

module.exports = sanitizeRegex;
