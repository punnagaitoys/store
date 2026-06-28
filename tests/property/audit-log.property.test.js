// Feature: punnagai-ecommerce, Property 23: Admin Operations Create Audit Log
/**
 * Property 23 — Admin Operations Create Audit Log
 *
 * **Validates: Requirements 17.8**
 *
 * For any admin operation (create/update/delete product; upload inventory;
 * mark order shipped; process refund), the system SHALL create an audit log
 * entry with timestamp, admin user ID, operation type, and relevant entity
 * details.
 *
 * This exercises the pure builder `buildAuditEntry` from js/lib/audit.js across
 * many generated inputs and asserts the four Property-23 fields are always
 * present and well-formed: timestamp, adminUserId, operationType, and entity
 * (carrying the relevant details). The global setup enforces numRuns >= 100.
 */
const fc = require('fast-check');
const audit = require('../../js/lib/audit');

const { ALLOWED_OPERATION_TYPES, buildAuditEntry, isValidOperationType, normalizeOperationType } = audit;

// Generator: an operationType drawn from the allowed set.
const allowedOperationType = () => fc.constantFrom(...ALLOWED_OPERATION_TYPES);

// Generator: an entity descriptor with a type and id, plus optional extras.
const entityArb = () =>
  fc.record({
    type: fc.constantFrom('product', 'inventory', 'order', 'refund'),
    id: fc.oneof(fc.string(), fc.integer({ min: 0, max: 1e9 }).map(String))
  });

// Generator: optional details object with arbitrary primitive values.
const detailsArb = () =>
  fc.dictionary(
    fc.string({ minLength: 1, maxLength: 12 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean())
  );

describe('Property 23 — Admin Operations Create Audit Log (Req 17.8)', () => {
  test('buildAuditEntry always produces a well-formed entry with all four required fields', () => {
    fc.assert(
      fc.property(
        allowedOperationType(),
        fc.string(),
        entityArb(),
        detailsArb(),
        (operationType, adminUserId, entity, details) => {
          const entry = buildAuditEntry({ adminUserId, operationType, entity, details });

          // (1) timestamp: always a finite number.
          expect(typeof entry.timestamp).toBe('number');
          expect(Number.isFinite(entry.timestamp)).toBe(true);

          // (2) operationType: equals normalized input and is in the allowed set.
          expect(entry.operationType).toBe(normalizeOperationType(operationType));
          expect(ALLOWED_OPERATION_TYPES).toContain(entry.operationType);
          expect(isValidOperationType(entry.operationType)).toBe(true);

          // (3) adminUserId: present as a string (a generated string is never null).
          expect(typeof entry.adminUserId).toBe('string');

          // (4) entity: an object carrying type/id plus the supplied details.
          expect(entry.entity).not.toBeNull();
          expect(typeof entry.entity).toBe('object');
          expect(entry.entity.type).toBe(entity.type);
          expect(entry.entity.id).toBe(entity.id);

          // details: always a plain object carrying the supplied details.
          expect(typeof entry.details).toBe('object');
          expect(entry.details).not.toBeNull();
          Object.keys(details).forEach((k) => {
            expect(entry.details[k]).toBe(details[k]);
          });
        }
      )
    );
  });

  test('buildAuditEntry throws for operationTypes outside the allowed set', () => {
    fc.assert(
      fc.property(
        fc.string(),
        entityArb(),
        (rawOperationType, entity) => {
          // Constrain to strings that normalize to something NOT in the allowed set.
          fc.pre(!isValidOperationType(rawOperationType));
          expect(() =>
            buildAuditEntry({ adminUserId: 'admin-1', operationType: rawOperationType, entity })
          ).toThrow();
        }
      )
    );
  });
});
