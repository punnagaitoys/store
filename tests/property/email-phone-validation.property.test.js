// Feature: punnagai-ecommerce, Property 14: Email and Phone Validation
/**
 * Property 14: Email and Phone Validation — Validates: Requirements 5.2
 *
 * For any email address and phone number, the registration validation SHALL
 * accept valid formats (practical RFC 5322 email; Indian phone numbers in the
 * +91 / 91 / 0 / bare forms with a 10-digit subscriber number) and reject
 * invalid formats consistently.
 *
 * `isValidEmail(email)` and `isValidIndianPhone(phone)` are PURE functions:
 * they take a single input and return a boolean with no side effects, so their
 * results are fully deterministic. We exercise them with smart generators that
 * produce KNOWN-VALID and KNOWN-INVALID examples and assert the validator
 * agrees, plus determinism (same input → same boolean).
 *
 * Per the documented decision in `js/lib/validation.js`, an Indian subscriber
 * number MUST begin with 6-9; the test is aligned to that documented rule.
 */
const fc = require('fast-check');
const validation = require('../../js/lib/validation');

const { isValidEmail, isValidIndianPhone } = validation;

// ── Email generators ───────────────────────────────────────────────────────

// Safe alphanumeric character (no specials, no dots) — guarantees the local
// part, domain labels and TLD never produce an accidentally-invalid shape.
const alnumChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
);
const letterChar = fc.constantFrom(
  ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
);

const alnumString = (min, max) =>
  fc.array(alnumChar, { minLength: min, maxLength: max }).map((cs) => cs.join(''));
const letterString = (min, max) =>
  fc.array(letterChar, { minLength: min, maxLength: max }).map((cs) => cs.join(''));

// A known-valid email: local@domain.tld using only safe alnum chars.
const validEmailArb = fc
  .record({
    local: alnumString(1, 20),
    domain: alnumString(1, 15),
    tld: letterString(2, 6),
  })
  .map(({ local, domain, tld }) => `${local}@${domain}.${tld}`);

// Known-invalid emails, built by disjoint construction so we never accidentally
// produce a valid address.
const invalidEmailArb = fc.oneof(
  // empty / whitespace-only
  fc.constantFrom('', ' ', '   ', '\t', '\n'),
  // no '@' at all
  alnumString(1, 20),
  // missing TLD (ends right after domain label, no dot+letters)
  fc
    .record({ local: alnumString(1, 10), domain: alnumString(1, 10) })
    .map(({ local, domain }) => `${local}@${domain}`),
  // contains a space inside the address
  fc
    .record({ local: alnumString(1, 8), domain: alnumString(1, 8), tld: letterString(2, 4) })
    .map(({ local, domain, tld }) => `${local} foo@${domain}.${tld}`),
  // missing local part
  fc
    .record({ domain: alnumString(1, 10), tld: letterString(2, 4) })
    .map(({ domain, tld }) => `@${domain}.${tld}`),
  // missing domain
  alnumString(1, 10).map((local) => `${local}@.com`),
  // single-letter TLD (regex requires 2+)
  fc
    .record({ local: alnumString(1, 8), domain: alnumString(1, 8), tld: letterChar })
    .map(({ local, domain, tld }) => `${local}@${domain}.${tld}`)
);

// ── Phone generators ─────────────────────────────────────────────────────────

const digitChar = fc.constantFrom(...'0123456789'.split(''));
const subscriberLeadDigit = fc.constantFrom('6', '7', '8', '9'); // valid lead 6-9

// A known-valid 10-digit subscriber: first digit 6-9, then 9 more digits.
const validSubscriberArb = fc
  .record({
    lead: subscriberLeadDigit,
    rest: fc.array(digitChar, { minLength: 9, maxLength: 9 }).map((d) => d.join('')),
  })
  .map(({ lead, rest }) => lead + rest);

// Valid phone = subscriber prefixed with one of the accepted country/trunk forms.
const validPhoneArb = fc
  .record({ prefix: fc.constantFrom('', '+91', '91', '0'), subscriber: validSubscriberArb })
  .map(({ prefix, subscriber }) => prefix + subscriber);

// Known-invalid phones, built by disjoint construction.
const invalidPhoneArb = fc.oneof(
  // empty / whitespace
  fc.constantFrom('', ' ', '   '),
  // wrong length: too short (1-9 digits, leading 6-9)
  fc
    .record({
      lead: subscriberLeadDigit,
      rest: fc.array(digitChar, { minLength: 0, maxLength: 8 }).map((d) => d.join('')),
    })
    .map(({ lead, rest }) => lead + rest),
  // wrong length: too long (11+ digits, no recognized prefix)
  fc.array(digitChar, { minLength: 11, maxLength: 14 }).map((d) => d.join('')),
  // valid length but subscriber leads with 0-5 (disallowed)
  fc
    .record({
      lead: fc.constantFrom('0', '1', '2', '3', '4', '5'),
      rest: fc.array(digitChar, { minLength: 9, maxLength: 9 }).map((d) => d.join('')),
    })
    .map(({ lead, rest }) => lead + rest),
  // contains letters
  fc
    .record({
      lead: subscriberLeadDigit,
      rest: fc.array(digitChar, { minLength: 8, maxLength: 8 }).map((d) => d.join('')),
    })
    .map(({ lead, rest }) => lead + rest + 'a'),
  // wrong country code (e.g. +1) on an otherwise 10-digit subscriber
  validSubscriberArb.map((s) => '+1' + s)
);

describe('Property 14: Email and Phone Validation (Req 5.2)', () => {
  test('ACCEPTS valid emails (local@domain.tld, practical RFC 5322)', () => {
    fc.assert(
      fc.property(validEmailArb, (email) => {
        expect(isValidEmail(email)).toBe(true);
      })
    );
  });

  test('REJECTS invalid emails (no @, missing TLD, spaces, empty, etc.)', () => {
    fc.assert(
      fc.property(invalidEmailArb, (email) => {
        expect(isValidEmail(email)).toBe(false);
      })
    );
  });

  test('ACCEPTS valid Indian phones (+91 / 91 / 0 / bare + 10-digit, lead 6-9)', () => {
    fc.assert(
      fc.property(validPhoneArb, (phone) => {
        expect(isValidIndianPhone(phone)).toBe(true);
      })
    );
  });

  test('REJECTS invalid Indian phones (wrong length, lead 0-5, letters, wrong code)', () => {
    fc.assert(
      fc.property(invalidPhoneArb, (phone) => {
        expect(isValidIndianPhone(phone)).toBe(false);
      })
    );
  });

  test('DETERMINISM: same email input always yields the same boolean', () => {
    fc.assert(
      fc.property(fc.oneof(validEmailArb, invalidEmailArb), (email) => {
        expect(isValidEmail(email)).toBe(isValidEmail(email));
      })
    );
  });

  test('DETERMINISM: same phone input always yields the same boolean', () => {
    fc.assert(
      fc.property(fc.oneof(validPhoneArb, invalidPhoneArb), (phone) => {
        expect(isValidIndianPhone(phone)).toBe(isValidIndianPhone(phone));
      })
    );
  });
});
