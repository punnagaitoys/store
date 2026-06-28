/**
 * Unit tests — js/lib/validation.js (pure form validation).
 *
 * Covers task 7.1's validation logic: RFC 5322-style email validation and
 * Indian phone validation (design Property 14 / Requirement 5.2), plus the
 * password-strength and registration-payload helpers. The exhaustive
 * property-based coverage of Property 14 lives in tests/property (task 7.2);
 * here we pin specific examples and edge cases.
 */
const validation = require('../../js/lib/validation');

describe('isValidEmail', () => {
  test('accepts common valid addresses', () => {
    [
      'john@example.com',
      'john.doe@example.co.in',
      'a_b+tag@sub.domain.org',
      "o'brien@mail.com",
      'user123@test-domain.com'
    ].forEach((email) => {
      expect(validation.isValidEmail(email)).toBe(true);
    });
  });

  test('rejects invalid addresses consistently', () => {
    [
      '',
      '   ',
      'plainaddress',
      '@no-local.com',
      'no-at-sign.com',
      'spaces in@email.com',
      'trailingdot@domain.',
      'double@@at.com',
      'no-tld@domain',
      'a@b.c' // single-char TLD rejected
    ].forEach((email) => {
      expect(validation.isValidEmail(email)).toBe(false);
    });
  });

  test('rejects non-string inputs', () => {
    [null, undefined, 42, {}, [], true].forEach((v) => {
      expect(validation.isValidEmail(v)).toBe(false);
    });
  });

  test('rejects addresses exceeding length limits', () => {
    const longLocal = 'a'.repeat(65) + '@example.com';
    expect(validation.isValidEmail(longLocal)).toBe(false);
  });
});

describe('isValidIndianPhone', () => {
  test('accepts the documented valid formats', () => {
    [
      '+919876543210',
      '919876543210',
      '09876543210',
      '9876543210',
      '6123456789',
      '+91 98765 43210',
      '98765-43210'
    ].forEach((phone) => {
      expect(validation.isValidIndianPhone(phone)).toBe(true);
    });
  });

  test('rejects invalid numbers consistently', () => {
    [
      '',
      '12345',
      '1234567890', // subscriber starts with 1 (not 6-9)
      '5876543210', // starts with 5
      '+9198765432', // too short
      '+9198765432100', // too long
      '+1 9876543210', // wrong country code
      'abcdefghij',
      '00876543210' // 0 + 10 digits but subscriber starts with 0
    ].forEach((phone) => {
      expect(validation.isValidIndianPhone(phone)).toBe(false);
    });
  });

  test('rejects non-string inputs', () => {
    [null, undefined, 9876543210, {}, []].forEach((v) => {
      expect(validation.isValidIndianPhone(v)).toBe(false);
    });
  });
});

describe('normalizeIndianPhone', () => {
  test('normalizes valid numbers to +91XXXXXXXXXX', () => {
    expect(validation.normalizeIndianPhone('09876543210')).toBe('+919876543210');
    expect(validation.normalizeIndianPhone('9876543210')).toBe('+919876543210');
    expect(validation.normalizeIndianPhone('+91 98765 43210')).toBe('+919876543210');
  });

  test('returns null for invalid numbers', () => {
    expect(validation.normalizeIndianPhone('12345')).toBeNull();
  });
});

describe('checkPasswordStrength', () => {
  test('accepts a password with letters + digits and length >= 6', () => {
    expect(validation.checkPasswordStrength('abc123').valid).toBe(true);
  });

  test('rejects short, letter-only, or digit-only passwords', () => {
    expect(validation.checkPasswordStrength('a1').valid).toBe(false);
    expect(validation.checkPasswordStrength('abcdef').valid).toBe(false);
    expect(validation.checkPasswordStrength('123456').valid).toBe(false);
    expect(validation.checkPasswordStrength('').valid).toBe(false);
  });
});

describe('validateRegistration', () => {
  test('valid payload yields no errors', () => {
    const result = validation.validateRegistration({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
      password: 'abc123'
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('collects field-level errors for an invalid payload', () => {
    const result = validation.validateRegistration({
      name: '',
      email: 'bad',
      phone: '123',
      password: 'x'
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('name');
    expect(result.errors).toHaveProperty('email');
    expect(result.errors).toHaveProperty('phone');
    expect(result.errors).toHaveProperty('password');
  });
});
