/**
 * validation.js — Pure form-validation logic (Punnagai / Kamaal Toy Store)
 *
 * Pure-logic module: NO DOM, NO Firebase, NO localStorage. Works in the browser
 * (as `window.PunnagaiValidation`) and under Node/Jest (via `module.exports`),
 * following the UMD dual-export pattern (see `js/lib/_umd-template.js` and
 * `js/lib/README.md`).
 *
 * Powers the customer registration/login forms (Requirement 5.1, 5.2) and is
 * exercised by the property test for Property 14 (task 7.2 / Requirement 5.2):
 * email + phone validation SHALL accept valid formats and reject invalid ones
 * consistently.
 *
 * ── Email validation (`isValidEmail`) ──────────────────────────────────────
 * Uses a single, widely-accepted "practical RFC 5322" regex (the HTML5
 * `<input type="email">` style pattern). It accepts the common addressable form
 *   local-part@domain.tld
 * where the local part allows letters, digits and the usual `.!#$%&'*+/=?^_`{|}~-`
 * specials (no leading/trailing/consecutive dots), and the domain is one or more
 * dot-separated labels of letters/digits/hyphens (labels not starting/ending
 * with a hyphen) ending in a TLD of at least two letters. This intentionally
 * does NOT implement the full RFC 5322 grammar (quoted strings, comments,
 * IP-literal domains) — those are vanishingly rare for a storefront sign-up and
 * are treated as invalid for predictable, consistent behavior.
 *
 * ── Indian phone validation (`isValidIndianPhone`) ─────────────────────────
 * Per design Property 14 ("Indian phone numbers starting with +91 or 0, 10
 * digits"). Before matching, common separators (spaces, hyphens, parentheses,
 * dots) are stripped. Accepted forms:
 *   1. `+91` followed by a 10-digit subscriber number      (e.g. +919876543210)
 *   2. `91`  followed by a 10-digit subscriber number      (e.g. 919876543210)
 *   3. `0`   followed by a 10-digit subscriber number      (e.g. 09876543210)
 *   4. a bare 10-digit subscriber number                   (e.g. 9876543210)
 * DECISION (documented): the 10-digit subscriber number MUST begin with 6, 7, 8
 * or 9 — this matches India's mobile numbering plan (TRAI) and the realistic
 * input space for customer sign-ups. Numbers whose subscriber part starts with
 * 0–5 are rejected. Anything else (wrong length, letters, other prefixes) is
 * rejected consistently.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiValidation = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  /**
   * Practical RFC 5322 email pattern (HTML5 email-input style). Anchored so the
   * ENTIRE string must match. Documented in the file header.
   * @type {RegExp}
   */
  const EMAIL_REGEX =
    /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/;

  /**
   * The 10-digit Indian subscriber number: first digit 6-9, then 9 more digits.
   * @type {RegExp}
   */
  const SUBSCRIBER_REGEX = /^[6-9]\d{9}$/;

  /** Max total email length guard (RFC 5321 caps addresses at 254 chars). */
  const MAX_EMAIL_LENGTH = 254;
  /** Max local-part length (RFC 5321). */
  const MAX_LOCAL_LENGTH = 64;

  /**
   * Validate an email address against the practical RFC 5322 pattern.
   *
   * Consistent contract: returns a boolean for ANY input. Non-string inputs,
   * empty/whitespace strings, addresses exceeding length limits, and addresses
   * that do not match the pattern all return `false`.
   *
   * @param {*} email
   * @returns {boolean} True when the email is a valid, addressable format.
   */
  function isValidEmail(email) {
    if (typeof email !== 'string') {
      return false;
    }
    const trimmed = email.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_EMAIL_LENGTH) {
      return false;
    }
    // Enforce the local-part length cap independently of the regex.
    const atIndex = trimmed.indexOf('@');
    if (atIndex === -1 || atIndex > MAX_LOCAL_LENGTH) {
      return false;
    }
    return EMAIL_REGEX.test(trimmed);
  }

  /**
   * Remove common phone-number separators so the core digits can be matched.
   * Strips spaces, hyphens, parentheses and dots. Leaves a leading `+` intact.
   * @param {string} phone
   * @returns {string}
   */
  function stripPhoneSeparators(phone) {
    return phone.replace(/[\s().-]/g, '');
  }

  /**
   * Extract the 10-digit subscriber number from an already-separator-stripped
   * phone string, accounting for the accepted country/trunk prefixes, or return
   * `null` when the prefix/shape is not one of the accepted forms.
   *
   * Accepted: `+91` + 10, `91` + 10, `0` + 10, or a bare 10-digit number.
   * @param {string} cleaned
   * @returns {?string} the 10-digit subscriber number, or null.
   */
  function extractSubscriber(cleaned) {
    if (/^\+91\d{10}$/.test(cleaned)) {
      return cleaned.slice(3);
    }
    if (/^91\d{10}$/.test(cleaned)) {
      return cleaned.slice(2);
    }
    if (/^0\d{10}$/.test(cleaned)) {
      return cleaned.slice(1);
    }
    if (/^\d{10}$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  /**
   * Validate an Indian phone number (see file header for accepted formats and
   * the documented decision to require a 6-9 leading subscriber digit).
   *
   * Consistent contract: returns a boolean for ANY input. Non-string inputs,
   * empty strings, wrong lengths, disallowed prefixes, or subscriber numbers
   * not starting with 6-9 all return `false`.
   *
   * @param {*} phone
   * @returns {boolean} True when the phone number is a valid Indian number.
   */
  function isValidIndianPhone(phone) {
    if (typeof phone !== 'string') {
      return false;
    }
    const cleaned = stripPhoneSeparators(phone.trim());
    if (cleaned.length === 0) {
      return false;
    }
    const subscriber = extractSubscriber(cleaned);
    if (subscriber === null) {
      return false;
    }
    return SUBSCRIBER_REGEX.test(subscriber);
  }

  /**
   * Normalize a valid Indian phone number to canonical `+91XXXXXXXXXX` form.
   * Returns `null` when the input is not a valid Indian phone number, so the
   * caller can store a single consistent representation.
   *
   * @param {*} phone
   * @returns {?string}
   */
  function normalizeIndianPhone(phone) {
    if (!isValidIndianPhone(phone)) {
      return null;
    }
    const subscriber = extractSubscriber(stripPhoneSeparators(String(phone).trim()));
    return '+91' + subscriber;
  }

  /** Minimum acceptable password length for registration. */
  const MIN_PASSWORD_LENGTH = 6;

  /**
   * Check password strength for the registration form.
   *
   * Rule (documented): a password is acceptable when it is a string of at least
   * 6 characters and contains at least one letter and at least one digit. This
   * is a light, predictable rule suited to a storefront sign-up; it is NOT a
   * full password policy engine.
   *
   * @param {*} password
   * @returns {{ valid: boolean, error: ?string }}
   */
  function checkPasswordStrength(password) {
    if (typeof password !== 'string' || password.length === 0) {
      return { valid: false, error: 'Password is required' };
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return {
        valid: false,
        error: 'Password must be at least ' + MIN_PASSWORD_LENGTH + ' characters'
      };
    }
    if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      return { valid: false, error: 'Password must contain at least one letter and one number' };
    }
    return { valid: true, error: null };
  }

  /**
   * Whether a required text field has a non-empty (non-whitespace) value.
   * @param {*} value
   * @returns {boolean}
   */
  function isNonEmpty(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  /**
   * Validate the whole registration form payload (Requirement 5.1, 5.2).
   *
   * Returns `{ valid, errors }` where `errors` is a field→message map. This is
   * pure: it performs no account creation — that glue lives in `js/auth.js`.
   *
   * @param {{ name?:*, email?:*, phone?:*, password?:* }} [fields]
   * @returns {{ valid: boolean, errors: Object<string,string> }}
   */
  function validateRegistration(fields) {
    fields = fields || {};
    const errors = {};

    if (!isNonEmpty(fields.name)) {
      errors.name = 'Name is required';
    }
    if (!isValidEmail(fields.email)) {
      errors.email = 'Please enter a valid email address';
    }
    if (!isValidIndianPhone(fields.phone)) {
      errors.phone = 'Please enter a valid Indian phone number';
    }
    const pwd = checkPasswordStrength(fields.password);
    if (!pwd.valid) {
      errors.password = pwd.error;
    }

    return { valid: Object.keys(errors).length === 0, errors: errors };
  }

  return {
    // core validators (Property 14)
    isValidEmail: isValidEmail,
    isValidIndianPhone: isValidIndianPhone,
    // helpers
    normalizeIndianPhone: normalizeIndianPhone,
    checkPasswordStrength: checkPasswordStrength,
    isNonEmpty: isNonEmpty,
    validateRegistration: validateRegistration,
    // exposed for tests/reuse
    EMAIL_REGEX: EMAIL_REGEX,
    MIN_PASSWORD_LENGTH: MIN_PASSWORD_LENGTH
  };
});
