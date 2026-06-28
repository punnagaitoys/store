/**
 * products-model.js — Pure product & variant model logic (Punnagai / Punnagai Toy Store)
 *
 * Pure-logic module: NO DOM, NO Firebase, NO localStorage. Works in the browser
 * (as `window.PunnagaiProductsModel`) and under Node/Jest (via `module.exports`).
 *
 * Responsibilities:
 *  - Build product and variant objects matching the design.md `products` schema.
 *  - Generate one unique SKU per size × color combination (Requirement 8.3,
 *    design Property 19) with independent price and stock fields.
 *  - Derive the displayed variant count so it matches the number of unique SKUs
 *    (Requirement 2.3, design Property 5).
 *
 * SKU uniqueness rule (documented):
 *  `generateSKUs(sizes, colors)` produces EXACTLY `sizes.length * colors.length`
 *  SKUs — one per index combination — and never deduplicates the input arrays.
 *  Uniqueness is guaranteed by embedding the size index and color index in every
 *  SKU, so even duplicate size/color labels (e.g. ["S", "S"]) still yield
 *  distinct SKUs. A human-readable slug of the label is appended for legibility.
 *  Example shape: `SKU-001-0-SMALL-1-BLUE`.
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiProductsModel = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  const DEFAULT_SKU_PREFIX = 'SKU';
  const DEFAULT_SEQUENCE = '001';
  const DEFAULT_VARIANT_PREFIX = 'var';

  /**
   * Normalize an arbitrary value into a safe array (non-arrays become []).
   * @param {*} value
   * @returns {Array}
   */
  function toArray(value) {
    return Array.isArray(value) ? value : [];
  }

  /**
   * Left-pad a number/string sequence to at least 3 digits (e.g. 1 -> "001").
   * Non-numeric strings are passed through after trimming.
   * @param {number|string} seq
   * @returns {string}
   */
  function normalizeSequence(seq) {
    if (seq === undefined || seq === null || seq === '') {
      return DEFAULT_SEQUENCE;
    }
    if (typeof seq === 'number' && isFinite(seq)) {
      return String(Math.trunc(Math.abs(seq))).padStart(3, '0');
    }
    const str = String(seq).trim();
    if (/^\d+$/.test(str)) {
      return str.padStart(3, '0');
    }
    return str;
  }

  /**
   * Convert a label into an uppercase alphanumeric slug. Anything that is not a
   * letter or digit collapses into nothing (it is index-disambiguated anyway).
   * @param {*} label
   * @returns {string}
   */
  function slugify(label) {
    if (label === undefined || label === null) {
      return '';
    }
    return String(label)
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '')
      .trim();
  }

  /**
   * Format a single SKU string for a given size/color index combination.
   * Indices guarantee uniqueness; slugs add readability.
   * @param {string} prefix
   * @param {string} sequence
   * @param {number} sizeIndex
   * @param {*} size
   * @param {number} colorIndex
   * @param {*} color
   * @returns {string}
   */
  function formatSKU(prefix, sequence, sizeIndex, size, colorIndex, color) {
    const sizeSlug = slugify(size);
    const colorSlug = slugify(color);
    let sku = prefix + '-' + sequence + '-' + sizeIndex;
    if (sizeSlug) {
      sku += '-' + sizeSlug;
    }
    sku += '-' + colorIndex;
    if (colorSlug) {
      sku += '-' + colorSlug;
    }
    return sku;
  }

  /**
   * Format a unique variant id, e.g. "var_001_1".
   * @param {string} prefix
   * @param {string} sequence
   * @param {number} comboNumber 1-based combination counter
   * @returns {string}
   */
  function formatVariantId(prefix, sequence, comboNumber) {
    return prefix + '_' + sequence + '_' + String(comboNumber).padStart(3, '0');
  }

  /**
   * Resolve an independent field value (price or stock) for a variant.
   * Accepts: a function (size, color, sizeIndex, colorIndex) => value,
   * a number/value, or undefined (falls back to `fallback`).
   * @param {Function|number|*} source
   * @param {*} fallback
   * @param {*} size
   * @param {*} color
   * @param {number} sizeIndex
   * @param {number} colorIndex
   * @returns {*}
   */
  function resolveField(source, fallback, size, color, sizeIndex, colorIndex) {
    if (typeof source === 'function') {
      const result = source(size, color, sizeIndex, colorIndex);
      return result === undefined ? fallback : result;
    }
    if (source === undefined || source === null) {
      return fallback;
    }
    return source;
  }

  /**
   * Generate one unique SKU per size × color combination.
   *
   * Produces EXACTLY `sizes.length * colors.length` SKUs (never deduped) and
   * every SKU is unique even when size/color labels repeat (design Property 19,
   * Requirement 8.3).
   *
   * @param {Array} sizes
   * @param {Array} colors
   * @param {Object} [options]
   * @param {string} [options.prefix="SKU"]
   * @param {number|string} [options.sequence="001"] product sequence segment
   * @returns {string[]} array of unique SKU strings (size-major order)
   */
  function generateSKUs(sizes, colors, options) {
    options = options || {};
    const sizeList = toArray(sizes);
    const colorList = toArray(colors);
    const prefix = options.prefix || DEFAULT_SKU_PREFIX;
    const sequence = normalizeSequence(
      options.sequence !== undefined ? options.sequence : options.productSeq
    );

    const skus = [];
    for (let i = 0; i < sizeList.length; i++) {
      for (let j = 0; j < colorList.length; j++) {
        skus.push(formatSKU(prefix, sequence, i, sizeList[i], j, colorList[j]));
      }
    }
    return skus;
  }

  /**
   * Build the full variant matrix (one variant object per size × color combo),
   * each with its own independent `price` and `stock` fields (Requirement 2.3 /
   * 8.3). Variant order is size-major and matches `generateSKUs`.
   *
   * @param {Array} sizes
   * @param {Array} colors
   * @param {Object} [options]
   * @param {string} [options.prefix="SKU"] SKU prefix
   * @param {string} [options.variantPrefix="var"] variant id prefix
   * @param {number|string} [options.sequence="001"] product sequence segment
   * @param {Function|number} [options.price] per-variant price (fn or value)
   * @param {number} [options.basePrice=0] fallback price
   * @param {Function|number} [options.stock] per-variant stock (fn or value)
   * @param {number} [options.defaultStock=0] fallback stock
   * @returns {Array<Object>} variant objects: {variantId, skuId, size, color, price, stock}
   */
  function buildVariants(sizes, colors, options) {
    options = options || {};
    const sizeList = toArray(sizes);
    const colorList = toArray(colors);
    const prefix = options.prefix || DEFAULT_SKU_PREFIX;
    const variantPrefix = options.variantPrefix || DEFAULT_VARIANT_PREFIX;
    const sequence = normalizeSequence(
      options.sequence !== undefined ? options.sequence : options.productSeq
    );
    const priceFallback = options.basePrice !== undefined ? options.basePrice : 0;
    const stockFallback = options.defaultStock !== undefined ? options.defaultStock : 0;

    const variants = [];
    let combo = 0;
    for (let i = 0; i < sizeList.length; i++) {
      for (let j = 0; j < colorList.length; j++) {
        combo += 1;
        const size = sizeList[i];
        const color = colorList[j];
        variants.push({
          variantId: formatVariantId(variantPrefix, sequence, combo),
          skuId: formatSKU(prefix, sequence, i, size, j, color),
          size: size,
          color: color,
          price: resolveField(options.price, priceFallback, size, color, i, j),
          stock: resolveField(options.stock, stockFallback, size, color, i, j)
        });
      }
    }
    return variants;
  }

  /**
   * Build a product object matching the design.md `products` collection schema.
   * If `data.sizes`/`data.colors` are supplied, variants are generated from the
   * matrix; otherwise an explicitly provided `data.variants` array is used.
   *
   * @param {Object} [data]
   * @returns {Object} product object
   */
  function buildProduct(data) {
    data = data || {};

    let variants;
    if (Array.isArray(data.variants)) {
      variants = data.variants;
    } else if (data.sizes !== undefined || data.colors !== undefined) {
      variants = buildVariants(data.sizes, data.colors, {
        prefix: data.skuPrefix,
        variantPrefix: data.variantPrefix,
        sequence: data.sequence,
        price: data.variantPrice,
        basePrice: data.basePrice,
        stock: data.variantStock,
        defaultStock: data.defaultStock
      });
    } else {
      variants = [];
    }

    return {
      productId: data.productId !== undefined ? data.productId : null,
      name: data.name !== undefined ? data.name : '',
      description: data.description !== undefined ? data.description : '',
      categoryId: data.categoryId !== undefined ? data.categoryId : null,
      basePrice: data.basePrice !== undefined ? data.basePrice : 0,
      ageRating: data.ageRating !== undefined ? data.ageRating : '',
      features: Array.isArray(data.features) ? data.features : [],
      materials: data.materials !== undefined ? data.materials : '',
      safetyInfo: data.safetyInfo !== undefined ? data.safetyInfo : '',
      imageUrl: data.imageUrl !== undefined ? data.imageUrl : '',
      thumbnails: Array.isArray(data.thumbnails) ? data.thumbnails : [],
      variants: variants,
      discount: data.discount !== undefined ? data.discount : null,
      createdAt: data.createdAt !== undefined ? data.createdAt : null,
      updatedAt: data.updatedAt !== undefined ? data.updatedAt : null,
      createdBy: data.createdBy !== undefined ? data.createdBy : null
    };
  }

  /**
   * Derive the number of displayed variant options from the size and color
   * option lists. This equals the number of unique SKUs produced for the same
   * inputs (design Property 5 / Requirement 2.3).
   *
   * @param {Array} sizes
   * @param {Array} colors
   * @returns {number}
   */
  function deriveVariantCount(sizes, colors) {
    return toArray(sizes).length * toArray(colors).length;
  }

  /**
   * Count the unique SKUs in a list of SKU strings or variant objects.
   * @param {Array<string|{skuId:string}>} items
   * @returns {number}
   */
  function countUniqueSKUs(items) {
    const list = toArray(items);
    const seen = new Set();
    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const sku = item && typeof item === 'object' ? item.skuId : item;
      seen.add(sku);
    }
    return seen.size;
  }

  /**
   * Get the number of displayed variant options for a built product (i.e. the
   * count of its variants). Pairs with `deriveVariantCount` for Property 5.
   * @param {Object} product
   * @returns {number}
   */
  function getDisplayedVariantCount(product) {
    if (!product || !Array.isArray(product.variants)) {
      return 0;
    }
    return product.variants.length;
  }

  return {
    generateSKUs: generateSKUs,
    buildVariants: buildVariants,
    buildProduct: buildProduct,
    deriveVariantCount: deriveVariantCount,
    countUniqueSKUs: countUniqueSKUs,
    getDisplayedVariantCount: getDisplayedVariantCount,
    // exposed helpers (useful for tests / reuse)
    slugify: slugify,
    formatSKU: formatSKU,
    formatVariantId: formatVariantId,
    normalizeSequence: normalizeSequence
  };
});
