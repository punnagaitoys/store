/**
 * Unit tests for the pure audit log builder (js/lib/audit.js).
 *
 * Covers Requirement 17.8 / 9.5: well-formed audit entries for admin
 * operations. (The Property 23 property test lives in tests/property.)
 */
const audit = require('../../js/lib/audit');

describe('audit.buildAuditEntry — pure builder', () => {
  test('exposes the allowed operation type set', () => {
    // Core product/inventory/order operations (Req 17.8 / 9.5).
    expect(audit.ALLOWED_OPERATION_TYPES).toEqual(
      expect.arrayContaining([
        'create_product',
        'update_product',
        'delete_product',
        'inventory_upload',
        'mark_shipped',
        'refund'
      ])
    );
    // Discount & coupon management operations (Requirement 11).
    expect(audit.ALLOWED_OPERATION_TYPES).toEqual(
      expect.arrayContaining([
        'create_discount',
        'create_coupon',
        'deactivate_coupon'
      ])
    );
  });

  test('builds an entry with all four required fields present', () => {
    const entry = audit.buildAuditEntry({
      adminUserId: 'admin_42',
      operationType: 'create_product',
      entity: { type: 'product', id: 'p1' },
      details: { name: 'Wooden Stacker' },
      timestamp: 1700000000000
    });

    expect(entry).toEqual({
      timestamp: 1700000000000,
      adminUserId: 'admin_42',
      operationType: 'create_product',
      entity: { type: 'product', id: 'p1' },
      details: { name: 'Wooden Stacker' }
    });
  });

  test('defaults timestamp to Date.now() when not supplied', () => {
    const before = Date.now();
    const entry = audit.buildAuditEntry({ adminUserId: 'a', operationType: 'refund' });
    const after = Date.now();
    expect(entry.timestamp).toBeGreaterThanOrEqual(before);
    expect(entry.timestamp).toBeLessThanOrEqual(after);
  });

  test('normalizes operationType (trim + lowercase)', () => {
    const entry = audit.buildAuditEntry({ operationType: '  MARK_SHIPPED ' });
    expect(entry.operationType).toBe('mark_shipped');
  });

  test('throws on an operationType outside the allowed set', () => {
    expect(() => audit.buildAuditEntry({ operationType: 'launch_rocket' })).toThrow(/invalid operationType/);
  });

  test('normalizes a bare string/number entity into an object with id', () => {
    expect(audit.buildAuditEntry({ operationType: 'delete_product', entity: 'p9' }).entity)
      .toEqual({ type: null, id: 'p9' });
    expect(audit.buildAuditEntry({ operationType: 'delete_product', entity: 7 }).entity)
      .toEqual({ type: null, id: '7' });
  });

  test('always provides entity and details objects even when omitted', () => {
    const entry = audit.buildAuditEntry({ operationType: 'inventory_upload' });
    expect(entry.entity).toEqual({ type: null, id: null });
    expect(entry.details).toEqual({});
    expect(entry.adminUserId).toBeNull();
  });

  test('coerces adminUserId to a string and preserves extra entity fields', () => {
    const entry = audit.buildAuditEntry({
      adminUserId: 123,
      operationType: 'update_product',
      entity: { type: 'product', id: 'p2', sku: 'SKU-2' }
    });
    expect(entry.adminUserId).toBe('123');
    expect(entry.entity).toEqual({ type: 'product', id: 'p2', sku: 'SKU-2' });
  });
});

describe('audit.isValidOperationType', () => {
  test('accepts every allowed type and rejects unknown ones', () => {
    audit.ALLOWED_OPERATION_TYPES.forEach((op) => {
      expect(audit.isValidOperationType(op)).toBe(true);
    });
    expect(audit.isValidOperationType('nope')).toBe(false);
    expect(audit.isValidOperationType(null)).toBe(false);
  });
});

describe('audit.writeAuditLog — browser glue guard', () => {
  test('returns a structured failure (not a throw) when no data layer is present', async () => {
    const result = await audit.writeAuditLog({ adminUserId: 'a', operationType: 'refund' });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/data layer/);
    expect(result.entry.operationType).toBe('refund');
  });
});
