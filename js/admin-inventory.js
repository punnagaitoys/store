/**
 * admin-inventory.js — Admin bulk inventory upload (Punnagai / Kamaal Toy Store)
 *
 * Parses `.csv` (built-in) and `.xlsx` (via an injectable / CDN-loaded parser)
 * inventory files, validates SKU format and non-negative quantities, produces a
 * per-row error report on failure, applies valid updates to per-SKU stock,
 * writes inventory + audit log entries, and offers a downloadable template CSV.
 *
 * Requirements covered:
 *  - 9.1: accept .xlsx / .csv uploads (browser glue + dual parser).
 *  - 9.2: parse the file and validate SKU format and quantity values.
 *  - 9.3: on invalid SKUs or negative quantities, produce an error report
 *         listing the problematic rows (row number + SKU). Upload halts — no
 *         partial application — matching design "Inventory Mismatch" handling.
 *  - 9.4: when the file is valid, update all SKU inventory levels.
 *  - 9.5 / 9.6 (17.x): track timestamp + admin user via inventory_logs and the
 *         audit log; download a template CSV with the correct columns.
 *  - 9.9: idempotent uploads — applying SET semantics (stock := Quantity) means
 *         re-uploading the same file (without order depletion) is a no-op, and
 *         total inventory equals the sum of file quantities.
 *  - 17.2 / 17.4: every inventory upload records who/what/when via the audit log.
 *
 * Design choices:
 *  - SET semantics (not increment): an upload row "SKU,...,Quantity" means the
 *    SKU's stock BECOMES that quantity. This is what makes a re-upload of the
 *    same file idempotent and guarantees total inventory == sum of quantities.
 *  - The pure parsing/validation/apply logic (below) has NO DOM / Firebase /
 *    localStorage dependency, so task 14.2 can unit/property test it directly.
 *  - xlsx parsing is INJECTABLE: pass a parser, or load SheetJS (`window.XLSX`)
 *    from a CDN in admin.html. CSV parsing needs no external dependency. This
 *    keeps the project build-step-free (no new npm dependency required).
 *
 * Uses the UMD-style dual-export pattern — see js/lib/_umd-template.js.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiAdminInventory = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // ----------------------------------------------------------------------
  // Constants
  // ----------------------------------------------------------------------

  /** Required template columns, in canonical order (Requirement 9.6). */
  const TEMPLATE_COLUMNS = Object.freeze([
    'SKU',
    'Product_Name',
    'Size',
    'Color',
    'Quantity'
  ]);

  /**
   * SKU format rule. Accepts the shapes produced by products-model
   * (e.g. `SKU-001-0-SMALL-1-BLUE`) and the design examples (`SKU-001-S-RED`):
   * a `SKU` prefix followed by one or more hyphen-separated alphanumeric
   * segments. Comparison is case-insensitive.
   */
  const SKU_PATTERN = /^SKU-[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*$/;

  // ----------------------------------------------------------------------
  // Small pure helpers
  // ----------------------------------------------------------------------

  /**
   * Coerce a value to a non-negative integer, or return null when it is not a
   * valid whole, non-negative number (used for quantity validation).
   * Accepts numbers and numeric strings; rejects negatives, fractions, NaN,
   * Infinity, blanks, and non-numeric text.
   * @param {*} value
   * @returns {number|null}
   */
  function toNonNegativeInteger(value) {
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        return null;
      }
      return value;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '' || !/^\d+$/.test(trimmed)) {
        return null;
      }
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  /**
   * Whether a SKU string matches the accepted SKU format (Requirement 9.2).
   * @param {*} sku
   * @returns {boolean}
   */
  function isValidSKUFormat(sku) {
    if (typeof sku !== 'string') {
      return false;
    }
    return SKU_PATTERN.test(sku.trim());
  }

  // ----------------------------------------------------------------------
  // CSV parsing (no external dependency)
  // ----------------------------------------------------------------------

  /**
   * Parse delimited (CSV) text into a list of field arrays. Handles quoted
   * fields (RFC-4180 style): embedded commas, embedded newlines, and escaped
   * double-quotes (`""`). Strips a leading UTF-8 BOM and tolerates CRLF/CR/LF.
   *
   * @param {string} text
   * @returns {string[][]} array of records, each an array of string fields.
   */
  function tokenizeCSV(text) {
    const rows = [];
    if (typeof text !== 'string' || text.length === 0) {
      return rows;
    }

    // Drop a UTF-8 BOM if present.
    let input = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

    let field = '';
    let record = [];
    let inQuotes = false;
    let i = 0;
    const len = input.length;

    function endField() {
      record.push(field);
      field = '';
    }
    function endRecord() {
      endField();
      rows.push(record);
      record = [];
    }

    while (i < len) {
      const ch = input[i];

      if (inQuotes) {
        if (ch === '"') {
          if (input[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i += 1;
          continue;
        }
        field += ch;
        i += 1;
        continue;
      }

      if (ch === '"') {
        inQuotes = true;
        i += 1;
        continue;
      }
      if (ch === ',') {
        endField();
        i += 1;
        continue;
      }
      if (ch === '\r') {
        // Treat CRLF and lone CR as a single record terminator.
        endRecord();
        if (input[i + 1] === '\n') {
          i += 2;
        } else {
          i += 1;
        }
        continue;
      }
      if (ch === '\n') {
        endRecord();
        i += 1;
        continue;
      }
      field += ch;
      i += 1;
    }

    // Flush the final field/record if there is any trailing content.
    if (field.length > 0 || record.length > 0) {
      endRecord();
    }

    return rows;
  }

  /**
   * Determine whether a tokenized record is effectively empty (all blank).
   * @param {string[]} record
   * @returns {boolean}
   */
  function isBlankRecord(record) {
    return record.every(function (cell) {
      return String(cell == null ? '' : cell).trim() === '';
    });
  }

  /**
   * Parse CSV text into a header + row-object structure.
   *
   * @param {string} text
   * @returns {{success:boolean, error?:string, header?:string[], rows?:Array<Object>}}
   *   On success, `rows` is an array of objects keyed by the header columns,
   *   each carrying a non-enumerable-friendly `_rowNumber` (1-based spreadsheet
   *   row, where the header is row 1 and the first data row is row 2).
   */
  function parseCSV(text) {
    const records = tokenizeCSV(text);
    if (records.length === 0) {
      return { success: false, error: 'File is empty' };
    }

    const header = records[0].map(function (h) {
      return String(h == null ? '' : h).trim();
    });

    const rows = [];
    for (let r = 1; r < records.length; r++) {
      const record = records[r];
      if (isBlankRecord(record)) {
        continue; // skip fully-blank lines (e.g. trailing newline)
      }
      const obj = { _rowNumber: r + 1 };
      for (let c = 0; c < header.length; c++) {
        const key = header[c];
        if (key === '') continue;
        const cell = record[c];
        obj[key] = cell == null ? '' : String(cell);
      }
      rows.push(obj);
    }

    return { success: true, header: header, rows: rows };
  }

  /**
   * Validate that a parsed header contains all required template columns.
   * @param {string[]} header
   * @returns {{success:boolean, error?:string, missing?:string[]}}
   */
  function validateHeader(header) {
    const present = Array.isArray(header)
      ? header.map(function (h) { return String(h).trim(); })
      : [];
    const missing = TEMPLATE_COLUMNS.filter(function (col) {
      return present.indexOf(col) === -1;
    });
    if (missing.length > 0) {
      return {
        success: false,
        missing: missing,
        error: 'Missing required column(s): ' + missing.join(', ')
      };
    }
    return { success: true };
  }

  // ----------------------------------------------------------------------
  // Row validation
  // ----------------------------------------------------------------------

  /**
   * Validate parsed rows and produce either a list of valid updates or a
   * per-row error report (Requirement 9.2, 9.3).
   *
   * A row is invalid when:
   *  - the SKU is missing / malformed (fails {@link isValidSKUFormat}),
   *  - the Quantity is missing, non-numeric, negative, or fractional,
   *  - `options.knownSKUs` is supplied and the SKU is not a member (the design
   *    "Bulk upload SKU not found" case).
   *
   * The function is total and never throws. When ANY row is invalid the upload
   * is considered failed (`success:false`) and `validUpdates` is still returned
   * (callers MUST NOT apply it on failure — the upload halts).
   *
   * @param {Array<Object>} rows - parsed row objects (with `_rowNumber`).
   * @param {Object} [options]
   * @param {Array<string>|Set<string>} [options.knownSKUs] - existing SKUs to
   *        check membership against (optional existence validation).
   * @returns {{success:boolean, validUpdates:Array<{skuId:string, quantity:number, rowNumber:number}>, errors:Array<{row:number, sku:string, message:string}>}}
   */
  function validateRows(rows, options) {
    options = options || {};
    const list = Array.isArray(rows) ? rows : [];

    let knownSet = null;
    if (options.knownSKUs) {
      knownSet = (options.knownSKUs instanceof Set)
        ? options.knownSKUs
        : new Set(Array.prototype.slice.call(options.knownSKUs));
    }

    const errors = [];
    const validUpdates = [];

    for (let i = 0; i < list.length; i++) {
      const row = list[i] || {};
      const rowNumber = typeof row._rowNumber === 'number' ? row._rowNumber : i + 2;
      const rawSku = row.SKU == null ? '' : String(row.SKU).trim();

      if (!isValidSKUFormat(rawSku)) {
        errors.push({
          row: rowNumber,
          sku: rawSku,
          message: rawSku === ''
            ? 'Missing SKU'
            : 'Invalid SKU format: "' + rawSku + '"'
        });
        continue;
      }

      const quantity = toNonNegativeInteger(row.Quantity);
      if (quantity === null) {
        errors.push({
          row: rowNumber,
          sku: rawSku,
          message: 'Invalid quantity: "' + String(row.Quantity == null ? '' : row.Quantity) +
            '" (must be a non-negative whole number)'
        });
        continue;
      }

      if (knownSet && !knownSet.has(rawSku)) {
        errors.push({
          row: rowNumber,
          sku: rawSku,
          message: 'SKU not found: "' + rawSku + '"'
        });
        continue;
      }

      validUpdates.push({ skuId: rawSku, quantity: quantity, rowNumber: rowNumber });
    }

    return {
      success: errors.length === 0,
      validUpdates: validUpdates,
      errors: errors
    };
  }

  // ----------------------------------------------------------------------
  // Applying updates (pure)
  // ----------------------------------------------------------------------

  /**
   * Apply validated updates to a plain `{ skuId: stock }` inventory map using
   * SET semantics (stock := quantity). Returns a NEW map; the input is not
   * mutated. When the same SKU appears more than once, the LAST occurrence
   * wins (deterministic), keeping the operation idempotent on re-upload.
   *
   * Key invariant (Requirement 9.9): after applying a file's updates, the stock
   * of every referenced SKU equals its file quantity, so the total across those
   * SKUs equals the sum of the file quantities, and re-applying the same file
   * changes nothing.
   *
   * @param {Object<string, number>} inventory - current per-SKU stock map.
   * @param {Array<{skuId:string, quantity:number}>} updates
   * @returns {Object<string, number>} a new per-SKU stock map.
   */
  function applyUpdates(inventory, updates) {
    const next = Object.assign({}, (inventory && typeof inventory === 'object') ? inventory : {});
    const list = Array.isArray(updates) ? updates : [];
    for (let i = 0; i < list.length; i++) {
      const update = list[i];
      if (!update || typeof update.skuId !== 'string') continue;
      const qty = toNonNegativeInteger(update.quantity);
      next[update.skuId] = qty === null ? next[update.skuId] : qty;
    }
    return next;
  }

  /**
   * Sum the quantities of a list of updates (helper for the key invariant /
   * tests: total inventory of referenced SKUs == sum of file quantities).
   * @param {Array<{quantity:number}>} updates
   * @returns {number}
   */
  function sumQuantities(updates) {
    const list = Array.isArray(updates) ? updates : [];
    return list.reduce(function (acc, u) {
      const qty = toNonNegativeInteger(u && u.quantity);
      return acc + (qty === null ? 0 : qty);
    }, 0);
  }

  // ----------------------------------------------------------------------
  // Template CSV
  // ----------------------------------------------------------------------

  /**
   * Build the template CSV content with the canonical header columns
   * (Requirement 9.6) and one illustrative example row.
   * @returns {string}
   */
  function buildTemplateCSV() {
    const header = TEMPLATE_COLUMNS.join(',');
    const example = ['SKU-001-0-SMALL-0-RED', 'Wooden Rainbow Stacker', 'Small', 'Red', '25'].join(',');
    return header + '\r\n' + example + '\r\n';
  }

  // ----------------------------------------------------------------------
  // High-level pure orchestration
  // ----------------------------------------------------------------------

  /**
   * Parse + validate already-extracted text or rows in one pure step. Does NOT
   * touch the database. Useful for tests and as the core of the browser flow.
   *
   * Provide EITHER `text` (CSV string) OR `rows` (pre-parsed row objects, e.g.
   * from an xlsx parser). On any failure (empty file, missing columns, invalid
   * rows) `success` is false and `errors`/`error` describe the problem; the
   * caller must NOT apply updates (the upload halts).
   *
   * @param {Object} input
   * @param {string} [input.text] - raw CSV text.
   * @param {Array<Object>} [input.rows] - pre-parsed rows (with optional Quantity/SKU keys).
   * @param {string[]} [input.header] - header for pre-parsed rows (defaults to template columns).
   * @param {Array<string>|Set<string>} [input.knownSKUs] - optional SKU existence set.
   * @returns {{success:boolean, error?:string, errors:Array<Object>, validUpdates:Array<Object>, rows:Array<Object>}}
   */
  function processInventoryData(input) {
    input = input || {};

    let header;
    let rows;

    if (typeof input.text === 'string') {
      const parsed = parseCSV(input.text);
      if (!parsed.success) {
        return { success: false, error: parsed.error, errors: [], validUpdates: [], rows: [] };
      }
      header = parsed.header;
      rows = parsed.rows;
    } else if (Array.isArray(input.rows)) {
      header = Array.isArray(input.header) ? input.header : TEMPLATE_COLUMNS.slice();
      rows = input.rows.map(function (r, idx) {
        // Ensure a row number for the error report if one isn't present.
        if (r && typeof r._rowNumber === 'number') return r;
        return Object.assign({ _rowNumber: idx + 2 }, r);
      });
    } else {
      return { success: false, error: 'No file content provided', errors: [], validUpdates: [], rows: [] };
    }

    const headerCheck = validateHeader(header);
    if (!headerCheck.success) {
      return { success: false, error: headerCheck.error, errors: [], validUpdates: [], rows: rows };
    }

    const validation = validateRows(rows, { knownSKUs: input.knownSKUs });
    return {
      success: validation.success,
      error: validation.success ? undefined : 'Validation failed for ' + validation.errors.length + ' row(s)',
      errors: validation.errors,
      validUpdates: validation.validUpdates,
      rows: rows
    };
  }

  // ----------------------------------------------------------------------
  // Browser-only glue (file reading, persistence, download)
  // ----------------------------------------------------------------------

  const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  /**
   * Read a File/Blob as text (browser only).
   * @param {Blob} file
   * @returns {Promise<string>}
   */
  function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || '')); };
      reader.onerror = function () { reject(reader.error || new Error('Failed to read file')); };
      reader.readAsText(file);
    });
  }

  /**
   * Read a File/Blob as an ArrayBuffer (browser only; used for xlsx).
   * @param {Blob} file
   * @returns {Promise<ArrayBuffer>}
   */
  function readFileAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(reader.error || new Error('Failed to read file')); };
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Convert an xlsx ArrayBuffer into row objects using an injectable parser or
   * the CDN-loaded SheetJS global (`window.XLSX`). Returns the same
   * `{header, rows}` shape as CSV parsing.
   *
   * @param {ArrayBuffer} buffer
   * @param {Object} [xlsx] - a SheetJS-compatible parser (defaults to window.XLSX).
   * @returns {{success:boolean, error?:string, header?:string[], rows?:Array<Object>}}
   */
  function parseXLSX(buffer, xlsx) {
    const lib = xlsx || (typeof window !== 'undefined' ? window.XLSX : null);
    if (!lib || typeof lib.read !== 'function') {
      return {
        success: false,
        error: 'XLSX parser unavailable. Load SheetJS (window.XLSX) or upload a .csv file.'
      };
    }
    try {
      const workbook = lib.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const matrix = lib.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
      if (!matrix || matrix.length === 0) {
        return { success: false, error: 'File is empty' };
      }
      const header = matrix[0].map(function (h) { return String(h == null ? '' : h).trim(); });
      const rows = [];
      for (let r = 1; r < matrix.length; r++) {
        const record = matrix[r] || [];
        if (record.every(function (c) { return String(c == null ? '' : c).trim() === ''; })) {
          continue;
        }
        const obj = { _rowNumber: r + 1 };
        for (let c = 0; c < header.length; c++) {
          if (header[c] === '') continue;
          obj[header[c]] = record[c] == null ? '' : String(record[c]);
        }
        rows.push(obj);
      }
      return { success: true, header: header, rows: rows };
    } catch (err) {
      return { success: false, error: 'Failed to parse xlsx file: ' + (err && err.message ? err.message : String(err)) };
    }
  }

  /**
   * Parse an uploaded File into `{header, rows}`, dispatching on extension.
   * `.csv` uses the built-in parser; `.xlsx`/`.xls` use an injectable parser.
   * @param {File} file
   * @param {Object} [options] - { xlsx } optional SheetJS-compatible parser.
   * @returns {Promise<{success:boolean, error?:string, header?:string[], rows?:Array<Object>}>}
   */
  async function parseFile(file, options) {
    options = options || {};
    if (!file || !file.name) {
      return { success: false, error: 'No file provided' };
    }
    const name = String(file.name).toLowerCase();
    if (name.endsWith('.csv')) {
      const text = await readFileAsText(file);
      return parseCSV(text);
    }
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const buffer = await readFileAsArrayBuffer(file);
      return parseXLSX(buffer, options.xlsx);
    }
    return { success: false, error: 'Unsupported file type. Upload a .csv or .xlsx file.' };
  }

  /**
   * Build a SKU index from the product catalog: maps skuId -> {product,
   * variantIndex, stock}. Used to validate SKU existence and apply updates.
   * @param {Array<Object>} products - products with `variants[]`.
   * @returns {{index:Object, knownSKUs:string[], stockMap:Object<string,number>}}
   */
  function buildSkuIndex(products) {
    const index = {};
    const stockMap = {};
    const knownSKUs = [];
    const list = Array.isArray(products) ? products : [];
    for (let p = 0; p < list.length; p++) {
      const product = list[p];
      const variants = (product && Array.isArray(product.variants)) ? product.variants : [];
      for (let v = 0; v < variants.length; v++) {
        const variant = variants[v];
        if (!variant || typeof variant.skuId !== 'string') continue;
        index[variant.skuId] = { product: product, variantIndex: v };
        const current = (typeof variant.stock === 'number') ? variant.stock : Number(variant.stock) || 0;
        stockMap[variant.skuId] = current;
        knownSKUs.push(variant.skuId);
      }
    }
    return { index: index, knownSKUs: knownSKUs, stockMap: stockMap };
  }

  /**
   * Full browser upload flow (Requirements 9.1–9.6, 17.2/17.4):
   *  1. Parse the file (.csv / .xlsx).
   *  2. Build the SKU index from the catalog and validate format + existence
   *     + non-negative quantity. On ANY error, halt and return the error report.
   *  3. Apply SET-semantics stock updates per variant (using inventory-model's
   *     `adjustStock` helper), persist via the data layer, and write an
   *     `inventory_logs` entry per changed SKU plus a single audit log entry.
   *
   * Dependencies are injectable for testing; in the browser they default to the
   * page globals (data.js functions, PunnagaiInventoryModel, PunnagaiAudit).
   *
   * @param {File} file
   * @param {Object} [deps]
   * @returns {Promise<{success:boolean, error?:string, errors?:Array<Object>, updatedCount?:number, uploadFileId?:string}>}
   */
  async function uploadInventoryFile(file, deps) {
    deps = deps || {};
    const getProductsFn = deps.getProducts || (typeof window !== 'undefined' ? window.getProducts : null);
    const updateProductFn = deps.updateProduct || (typeof window !== 'undefined' ? window.updateProduct : null);
    const createInventoryLogFn = deps.createInventoryLog || (typeof window !== 'undefined' ? window.createInventoryLog : null);
    const inventoryModel = deps.inventoryModel || (typeof window !== 'undefined' ? window.PunnagaiInventoryModel : null);
    const audit = deps.audit || (typeof window !== 'undefined' ? window.PunnagaiAudit : null);
    const adminUserId = deps.adminUserId || null;

    if (typeof getProductsFn !== 'function' || typeof updateProductFn !== 'function') {
      return { success: false, error: 'Data layer unavailable (getProducts/updateProduct not found)' };
    }

    // 1. Parse.
    const parsed = await parseFile(file, { xlsx: deps.xlsx });
    if (!parsed.success) {
      return { success: false, error: parsed.error, errors: [] };
    }

    // 2. Index catalog + validate.
    const products = await getProductsFn({});
    const skuIndex = buildSkuIndex(products);
    const result = processInventoryData({
      rows: parsed.rows,
      header: parsed.header,
      knownSKUs: skuIndex.knownSKUs
    });
    if (!result.success) {
      return { success: false, error: result.error, errors: result.errors };
    }

    // 3. Apply updates (SET semantics) per product/variant + write logs.
    const uploadFileId = 'upload_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    const uploadedAt = Date.now();
    const productsToUpdate = {}; // productId -> { product, variants[] }
    const logEntries = [];

    for (let i = 0; i < result.validUpdates.length; i++) {
      const update = result.validUpdates[i];
      const entry = skuIndex.index[update.skuId];
      if (!entry) continue; // already guarded by knownSKUs, defensive only
      const product = entry.product;
      const pid = product.id || product.productId;
      if (!productsToUpdate[pid]) {
        productsToUpdate[pid] = {
          product: product,
          variants: product.variants.map(function (v) { return Object.assign({}, v); })
        };
      }
      const variants = productsToUpdate[pid].variants;
      const variant = variants[entry.variantIndex];
      const previousStock = (typeof variant.stock === 'number') ? variant.stock : Number(variant.stock) || 0;
      const newStock = update.quantity;

      // Use inventory-model's adjustStock helper to reach the target safely.
      if (inventoryModel && typeof inventoryModel.adjustStock === 'function') {
        variants[entry.variantIndex] = inventoryModel.adjustStock(variant, newStock - previousStock);
      } else {
        variants[entry.variantIndex] = Object.assign({}, variant, { stock: Math.max(0, newStock) });
      }

      logEntries.push({
        skuId: update.skuId,
        previousStock: previousStock,
        newStock: variants[entry.variantIndex].stock,
        changeReason: 'bulk_upload',
        quantityChanged: variants[entry.variantIndex].stock - previousStock,
        uploadFileId: uploadFileId,
        uploadedBy: adminUserId,
        uploadedAt: uploadedAt
      });
    }

    // Persist product variant updates.
    let updatedCount = 0;
    const pids = Object.keys(productsToUpdate);
    for (let p = 0; p < pids.length; p++) {
      const bundle = productsToUpdate[pids[p]];
      const res = await updateProductFn(pids[p], { variants: bundle.variants });
      if (res && res.success) {
        updatedCount += 1;
      }
    }

    // Write inventory_logs entries (Requirement 9.5 — timestamps + quantities).
    if (typeof createInventoryLogFn === 'function') {
      for (let l = 0; l < logEntries.length; l++) {
        await createInventoryLogFn(logEntries[l]);
      }
    }

    // Write a single audit log entry for the upload (Requirements 17.2/17.4).
    if (audit && typeof audit.writeAuditLog === 'function') {
      try {
        await audit.writeAuditLog({
          adminUserId: adminUserId,
          operationType: audit.OPERATION_TYPES ? audit.OPERATION_TYPES.INVENTORY_UPLOAD : 'inventory_upload',
          entity: { type: 'inventory', id: uploadFileId },
          details: {
            uploadFileId: uploadFileId,
            rowsApplied: result.validUpdates.length,
            skuCount: logEntries.length,
            totalQuantity: sumQuantities(result.validUpdates)
          }
        });
      } catch (err) {
        // Audit failure should not silently corrupt the upload result; surface it.
        console.error('Audit log write failed for inventory upload:', err);
      }
    }

    return {
      success: true,
      updatedCount: updatedCount,
      skuCount: logEntries.length,
      uploadFileId: uploadFileId
    };
  }

  /**
   * Trigger a browser download of the template CSV (Requirement 9.6).
   * No-op outside the browser.
   * @param {string} [filename]
   * @returns {boolean} true if the download was triggered.
   */
  function downloadTemplate(filename) {
    if (!isBrowser) {
      return false;
    }
    const content = buildTemplateCSV();
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'inventory_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  }

  return {
    // Constants
    TEMPLATE_COLUMNS: TEMPLATE_COLUMNS,
    SKU_PATTERN: SKU_PATTERN,
    // Pure validation/parsing
    isValidSKUFormat: isValidSKUFormat,
    toNonNegativeInteger: toNonNegativeInteger,
    tokenizeCSV: tokenizeCSV,
    parseCSV: parseCSV,
    validateHeader: validateHeader,
    validateRows: validateRows,
    applyUpdates: applyUpdates,
    sumQuantities: sumQuantities,
    buildTemplateCSV: buildTemplateCSV,
    processInventoryData: processInventoryData,
    // Browser glue (and injectable helpers)
    parseXLSX: parseXLSX,
    parseFile: parseFile,
    buildSkuIndex: buildSkuIndex,
    uploadInventoryFile: uploadInventoryFile,
    downloadTemplate: downloadTemplate
  };
});
