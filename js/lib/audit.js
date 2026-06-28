/**
 * audit.js — Admin audit log builder (Punnagai Toy Store)
 *
 * Pure logic for constructing well-formed audit log entries plus a thin,
 * browser-only async writer that delegates persistence to the data layer.
 *
 * Validates: Requirements 17.8 (audit log of who/what/when), 9.5 (inventory
 * audit log with timestamps and quantities changed).
 *
 * The PURE part (`buildAuditEntry`, `isValidOperationType`,
 * `ALLOWED_OPERATION_TYPES`, `OPERATION_TYPES`) has NO DOM / Firebase /
 * localStorage dependency so it is unit- and property-testable under Jest.
 * The side-effectful glue (`writeAuditLog`) is guarded for the browser global
 * environment and delegates to `window.createAuditLog` in `js/data.js`.
 *
 * Uses the UMD-style dual-export pattern — see js/lib/_umd-template.js and
 * js/lib/README.md.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiAudit = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  /**
   * Canonical operation types for admin operations that must be audited.
   * Covers: create/update/delete product, inventory upload, mark shipped,
   * refund, plus discount/coupon management (create discount, create coupon,
   * deactivate coupon).
   */
  const OPERATION_TYPES = Object.freeze({
    CREATE_PRODUCT: 'create_product',
    UPDATE_PRODUCT: 'update_product',
    DELETE_PRODUCT: 'delete_product',
    INVENTORY_UPLOAD: 'inventory_upload',
    MARK_SHIPPED: 'mark_shipped',
    REFUND: 'refund',
    CREATE_DISCOUNT: 'create_discount',
    CREATE_COUPON: 'create_coupon',
    DEACTIVATE_COUPON: 'deactivate_coupon',
    // Category & banner management (Requirement 12)
    CREATE_CATEGORY: 'create_category',
    UPDATE_CATEGORY: 'update_category',
    DELETE_CATEGORY: 'delete_category',
    ASSIGN_PRODUCT_CATEGORY: 'assign_product_category',
    CREATE_BANNER: 'create_banner',
    UPDATE_BANNER: 'update_banner',
    DELETE_BANNER: 'delete_banner',
    TOGGLE_BANNER: 'toggle_banner'
  });

  /**
   * The allowed set of operation types, exported for validation by callers
   * and tests.
   * @type {ReadonlyArray<string>}
   */
  const ALLOWED_OPERATION_TYPES = Object.freeze(Object.keys(OPERATION_TYPES).map(function (k) {
    return OPERATION_TYPES[k];
  }));

  /**
   * Normalize a raw operationType into a canonical, comparable form
   * (trimmed + lower-cased). Non-string inputs become an empty string.
   * @param {*} operationType
   * @returns {string}
   */
  function normalizeOperationType(operationType) {
    if (typeof operationType !== 'string') return '';
    return operationType.trim().toLowerCase();
  }

  /**
   * Whether a (normalized) operationType is part of the allowed set.
   * @param {*} operationType
   * @returns {boolean}
   */
  function isValidOperationType(operationType) {
    return ALLOWED_OPERATION_TYPES.indexOf(normalizeOperationType(operationType)) !== -1;
  }

  /**
   * Normalize the `entity` descriptor into a plain object that always carries
   * `type` and `id` keys (defaulting to null) plus any extra entity details.
   * Accepts an object, a string/number id, or nullish.
   * @param {*} entity
   * @returns {{type: *, id: *}}
   */
  function normalizeEntity(entity) {
    if (entity && typeof entity === 'object' && !Array.isArray(entity)) {
      // Keep any caller-provided fields, but guarantee type/id are present.
      return Object.assign({ type: null, id: null }, entity);
    }
    if (typeof entity === 'string' || typeof entity === 'number') {
      return { type: null, id: String(entity) };
    }
    return { type: null, id: null };
  }

  /**
   * Build a well-formed, normalized audit log entry.
   *
   * Property 23 (Req 17.8): every admin operation must produce an entry with
   * a timestamp, admin user ID, operation type, and relevant entity details.
   * This builder guarantees all four fields are always present on the result
   * and that `operationType` is a member of the allowed set (it throws for an
   * unknown operation type so malformed entries can never be created).
   *
   * @param {Object} input
   * @param {string|number|null} [input.adminUserId] - ID of the acting admin.
   * @param {string} input.operationType - one of ALLOWED_OPERATION_TYPES.
   * @param {Object|string|number|null} [input.entity] - the affected entity
   *   (object with type/id, or a bare id). Always normalized to an object.
   * @param {Object} [input.details] - additional operation details (e.g.
   *   changed fields, quantities, order id).
   * @param {number} [input.timestamp] - epoch millis; defaults to Date.now().
   * @returns {{timestamp:number, adminUserId:(string|null), operationType:string, entity:Object, details:Object}}
   * @throws {Error} if operationType is not in the allowed set.
   */
  function buildAuditEntry(input) {
    const src = (input && typeof input === 'object') ? input : {};

    const operationType = normalizeOperationType(src.operationType);
    if (!isValidOperationType(operationType)) {
      throw new Error(
        'buildAuditEntry: invalid operationType "' + String(src.operationType) +
        '". Expected one of: ' + ALLOWED_OPERATION_TYPES.join(', ')
      );
    }

    const timestamp = (typeof src.timestamp === 'number' && isFinite(src.timestamp))
      ? src.timestamp
      : Date.now();

    const adminUserId = (src.adminUserId === undefined || src.adminUserId === null)
      ? null
      : String(src.adminUserId);

    const entity = normalizeEntity(src.entity);

    const details = (src.details && typeof src.details === 'object' && !Array.isArray(src.details))
      ? Object.assign({}, src.details)
      : {};

    return { timestamp: timestamp, adminUserId: adminUserId, operationType: operationType, entity: entity, details: details };
  }

  /**
   * Thin async writer that persists an audit entry via the data layer.
   *
   * Keeps persistence glue out of the pure builder. In the browser it builds a
   * normalized entry (idempotent if already built) and delegates to the
   * data-layer `window.createAuditLog`. Outside a browser environment with no
   * data layer available, it returns a structured failure rather than throwing
   * so the pure module stays import-safe under Node/Jest.
   *
   * @param {Object} entry - raw input accepted by buildAuditEntry, or an
   *   already-built entry.
   * @returns {Promise<{success:boolean, id?:string, error?:string, entry:Object}>}
   */
  async function writeAuditLog(entry) {
    const auditEntry = buildAuditEntry(entry);

    if (typeof window !== 'undefined' && typeof window.createAuditLog === 'function') {
      const result = await window.createAuditLog(auditEntry);
      return Object.assign({ entry: auditEntry }, result);
    }

    return {
      success: false,
      error: 'audit log writer unavailable: data layer (window.createAuditLog) not found',
      entry: auditEntry
    };
  }

  return {
    OPERATION_TYPES: OPERATION_TYPES,
    ALLOWED_OPERATION_TYPES: ALLOWED_OPERATION_TYPES,
    isValidOperationType: isValidOperationType,
    normalizeOperationType: normalizeOperationType,
    normalizeEntity: normalizeEntity,
    buildAuditEntry: buildAuditEntry,
    writeAuditLog: writeAuditLog
  };
});
