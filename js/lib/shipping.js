/**
 * shipping.js — Pure multi-region shipping logic (Punnagai / Punnagai Toy Store)
 *
 * Pure-logic module: NO DOM, NO Firebase, NO localStorage, NO direct network.
 * Works in the browser (as `window.PunnagaiShipping`) and under Node/Jest
 * (via `module.exports`). All side effects (courier HTTP calls, cached-default
 * lookups, tracking-number randomness) are isolated behind INJECTABLE seams so
 * the core logic stays deterministic and testable.
 *
 * Implements Requirement 7 (Multi-Region Shipping Integration):
 *  - determineRegion(postalCode)          → Req 7.1 (region from Indian PIN)
 *  - getAvailableMethods(region)          → Req 7.2, 7.5 (methods + free local)
 *  - fetchShippingQuote(region,opts,fetchFn) → Req 7.3, 7.4 (courier + cached fallback)
 *  - createShipment(orderDetails, opts)   → Req 7.6, 7.7 (shipment + tracking number)
 *  - getTracking(trackingNumber, opts)    → Req 7.7, 7.8 (tracking lookup)
 *  - createInMemoryCourier()              → testable courier seam for the round trip
 *
 * Correctness properties this module is built to satisfy:
 *  - Property 15 (Req 6.4/7.1): determineRegion is DETERMINISTIC — the same
 *    postal code always yields the same region. Invalid PINs return null.
 *  - Property 18 (Req 7.5): LOCAL delivery cost is EXACTLY 0, regardless of
 *    order value or item count.
 *  - Invariant (Req 7): shipping cost is NON-NEGATIVE for every region.
 *  - Idempotence (Req 7): same postal code → same available options.
 *  - Round Trip (Req 7): createShipment → getTracking → courier query returns
 *    matching tracking information (see createInMemoryCourier).
 *
 * Indian PIN region rules (documented):
 *  A valid PIN is a 6-digit string/number whose first digit is 1-9.
 *  - LOCAL (free delivery zone): Chennai city PINs 600001–600100. This covers
 *    the store's neighbourhood, Mylapore (600004), and adjacent Chennai metro
 *    delivery areas. Tunable via LOCAL_PIN_MIN / LOCAL_PIN_MAX.
 *  - TAMIL NADU: PINs in the Tamil Nadu postal band 600000–643999 that are not
 *    in the local zone. Tunable via TN_PIN_MIN / TN_PIN_MAX.
 *  - ALL-INDIA: every other valid PIN.
 *  - INVALID: anything not a 6-digit PIN with a leading 1-9 → null.
 *
 * Cached-default contract (Req 7.4):
 *  The data layer (`js/data.js` → getShippingIntegrationByRegion) exposes a
 *  `shipping_integrations` record per region: { provider, region, baseCost,
 *  estimatedDays, active, ... }. Glue code fetches that record and passes it to
 *  fetchShippingQuote via `opts.cachedDefault` so this module stays pure. When
 *  the courier call fails / is unavailable, the quote falls back to that cached
 *  default (or the built-in DEFAULT_QUOTES when no cached default is supplied).
 */
(function (root, factory) {
  'use strict';

  const api = factory();

  // Browser: expose the API on the global object as a namespaced global.
  if (typeof window !== 'undefined') {
    window.PunnagaiShipping = api;
  }

  // Node / Jest: expose the API via CommonJS so tests can require() it.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
})(typeof self !== 'undefined' ? self : this, function factory() {
  'use strict';

  // Region identifiers (mirror the `shipping_integrations.region` enum).
  const REGIONS = ['local', 'tamilnadu', 'allindia'];

  // Local (free) delivery zone — Chennai city PIN band incl. Mylapore (600004).
  const LOCAL_PIN_MIN = 600001;
  const LOCAL_PIN_MAX = 600100;

  // Tamil Nadu postal band.
  const TN_PIN_MIN = 600000;
  const TN_PIN_MAX = 643999;

  /**
   * Shipping methods available per region. Costs are in ₹ (INR) and are all
   * non-negative (Req 7 invariant). The single local method is FREE (cost 0,
   * Req 7.5 / Property 18). Returned objects are always freshly cloned so callers
   * can never mutate this template.
   */
  const REGION_METHODS = {
    local: [{ id: 'local_delivery', label: 'Free Local Delivery', cost: 0, estimatedDays: 1 }],
    tamilnadu: [
      { id: 'standard', label: 'Standard (Tamil Nadu)', cost: 49, estimatedDays: 3 },
      { id: 'express', label: 'Express (Tamil Nadu)', cost: 99, estimatedDays: 1 }
    ],
    allindia: [
      { id: 'standard', label: 'Standard (All India)', cost: 79, estimatedDays: 6 },
      { id: 'express', label: 'Express (All India)', cost: 149, estimatedDays: 3 }
    ]
  };

  /**
   * Built-in cached defaults used by fetchShippingQuote when the courier API is
   * unavailable AND no `opts.cachedDefault` (from `shipping_integrations`) is
   * supplied. Costs are non-negative; local is free.
   */
  const DEFAULT_QUOTES = {
    local: { cost: 0, estimatedDays: 1, provider: 'local-delivery' },
    tamilnadu: { cost: 49, estimatedDays: 3, provider: 'default' },
    allindia: { cost: 79, estimatedDays: 6, provider: 'default' }
  };

  /**
   * Normalize a postal code into a canonical 6-digit string, or return null if
   * it is not a valid Indian PIN (6 digits, leading digit 1-9). Accepts numbers
   * or strings; tolerates surrounding whitespace.
   * @param {*} postalCode
   * @returns {string|null}
   */
  function normalizePin(postalCode) {
    if (postalCode === undefined || postalCode === null) {
      return null;
    }
    const str = String(postalCode).trim();
    if (!/^[1-9]\d{5}$/.test(str)) {
      return null;
    }
    return str;
  }

  /**
   * Determine the shipping region for an Indian postal code (Req 7.1).
   * Deterministic: the same input always maps to the same region (Property 15).
   * Invalid PINs are handled gracefully by returning null.
   *
   * @param {string|number} postalCode
   * @returns {'local'|'tamilnadu'|'allindia'|null}
   */
  function determineRegion(postalCode) {
    const pin = normalizePin(postalCode);
    if (pin === null) {
      return null;
    }
    const n = Number(pin);
    if (n >= LOCAL_PIN_MIN && n <= LOCAL_PIN_MAX) {
      return 'local';
    }
    if (n >= TN_PIN_MIN && n <= TN_PIN_MAX) {
      return 'tamilnadu';
    }
    return 'allindia';
  }

  /**
   * Return the shipping methods available for a region (Req 7.2), each with a
   * cost and estimated delivery days. Returns a deep copy so callers cannot
   * mutate the template. Unknown / null regions return an empty array.
   *
   * Idempotent (Req 7): the same region always yields the same options, so
   * determineRegion(pin) → getAvailableMethods(region) is stable for a given PIN.
   * Local delivery is always cost 0 (Req 7.5 / Property 18).
   *
   * @param {'local'|'tamilnadu'|'allindia'} region
   * @returns {Array<{id:string,label:string,cost:number,estimatedDays:number}>}
   */
  function getAvailableMethods(region) {
    const methods = REGION_METHODS[region];
    if (!methods) {
      return [];
    }
    return methods.map(function (m) {
      return { id: m.id, label: m.label, cost: m.cost, estimatedDays: m.estimatedDays };
    });
  }

  /**
   * Convenience: resolve available shipping methods directly from a postal code.
   * Combines determineRegion + getAvailableMethods (Req 7.1 + 7.2). Invalid PINs
   * yield an empty list.
   * @param {string|number} postalCode
   * @returns {Array<Object>}
   */
  function getMethodsForPostalCode(postalCode) {
    return getAvailableMethods(determineRegion(postalCode));
  }

  /**
   * Coerce to a finite, non-negative number (clamps negatives to 0) so a
   * malformed cached default or courier response can never produce a negative
   * shipping cost (Req 7 invariant).
   * @param {*} value
   * @param {number} fallback
   * @returns {number}
   */
  function toNonNegative(value, fallback) {
    const n = Number(value);
    if (!isFinite(n) || n < 0) {
      return fallback;
    }
    return n;
  }

  /**
   * Resolve the cached/default quote for a region (Req 7.4). Prefers a supplied
   * `cachedDefault` (a `shipping_integrations` record: { baseCost, estimatedDays,
   * provider }) and falls back to the built-in DEFAULT_QUOTES. Costs are forced
   * non-negative; local stays free.
   * @param {'local'|'tamilnadu'|'allindia'} region
   * @param {Object} [cachedDefault]
   * @returns {{cost:number,estimatedDays:number,provider:string}}
   */
  function resolveCachedDefault(region, cachedDefault) {
    const builtIn = DEFAULT_QUOTES[region] || DEFAULT_QUOTES.allindia;
    if (region === 'local') {
      // Local is always free regardless of any cached record (Property 18).
      return {
        cost: 0,
        estimatedDays: toNonNegative(
          cachedDefault && cachedDefault.estimatedDays,
          builtIn.estimatedDays
        ),
        provider: (cachedDefault && cachedDefault.provider) || builtIn.provider
      };
    }
    if (cachedDefault && typeof cachedDefault === 'object') {
      return {
        cost: toNonNegative(
          cachedDefault.baseCost !== undefined ? cachedDefault.baseCost : cachedDefault.cost,
          builtIn.cost
        ),
        estimatedDays: toNonNegative(cachedDefault.estimatedDays, builtIn.estimatedDays),
        provider: cachedDefault.provider || builtIn.provider
      };
    }
    return { cost: builtIn.cost, estimatedDays: builtIn.estimatedDays, provider: builtIn.provider };
  }

  /**
   * Fetch a shipping quote for a region (Req 7.3), calling the courier API via
   * an INJECTED `fetchFn`, and falling back to a cached/default quote when the
   * courier is unavailable or errors (Req 7.4). The network call is fully
   * injectable so tests never touch the network.
   *
   * `fetchFn(region, opts)` is expected to resolve to a quote-like object
   * `{ cost, estimatedDays, provider }`. Any throw, rejection, or unusable
   * response triggers the cached-default fallback.
   *
   * Guarantees:
   *  - Local region is always free (cost 0) without a network call (Property 18).
   *  - The returned `cost` is always non-negative (Req 7 invariant).
   *  - `source` is one of 'local-free' | 'courier' | 'cached'.
   *
   * @param {'local'|'tamilnadu'|'allindia'} region
   * @param {Object} [opts] - { cachedDefault, ...passed through to fetchFn }
   * @param {Function} [fetchFn] - async courier call; omit to use cached default
   * @returns {Promise<{region:string,cost:number,estimatedDays:number,provider:string,source:string}>}
   */
  async function fetchShippingQuote(region, opts, fetchFn) {
    opts = opts || {};
    const safeRegion = REGIONS.indexOf(region) !== -1 ? region : 'allindia';

    // Local delivery is free; never depends on the courier (Req 7.5 / Property 18).
    if (safeRegion === 'local') {
      const def = resolveCachedDefault('local', opts.cachedDefault);
      return {
        region: 'local',
        cost: 0,
        estimatedDays: def.estimatedDays,
        provider: def.provider,
        source: 'local-free'
      };
    }

    if (typeof fetchFn === 'function') {
      try {
        const quote = await fetchFn(safeRegion, opts);
        if (
          quote &&
          typeof quote === 'object' &&
          (quote.cost !== undefined || quote.baseCost !== undefined)
        ) {
          const def = resolveCachedDefault(safeRegion, opts.cachedDefault);
          return {
            region: safeRegion,
            cost: toNonNegative(quote.cost !== undefined ? quote.cost : quote.baseCost, def.cost),
            estimatedDays: toNonNegative(quote.estimatedDays, def.estimatedDays),
            provider: quote.provider || def.provider,
            source: 'courier'
          };
        }
        // Unusable response → fall through to cached default.
      } catch (err) {
        // Courier unavailable → fall through to cached default (Req 7.4).
      }
    }

    const fallback = resolveCachedDefault(safeRegion, opts.cachedDefault);
    return {
      region: safeRegion,
      cost: fallback.cost,
      estimatedDays: fallback.estimatedDays,
      provider: fallback.provider,
      source: 'cached'
    };
  }

  /**
   * Deterministic default tracking-number generator. Pure function of the order
   * details, so the create→track round trip is reproducible in tests. Format:
   *   PNG-<REGION>-<ORDERID>
   * Glue code may inject its own generator (e.g. the real courier's number) via
   * `opts.generateTrackingNumber`.
   * @param {Object} orderDetails
   * @returns {string}
   */
  function defaultTrackingNumber(orderDetails) {
    const od = orderDetails || {};
    const region = REGIONS.indexOf(od.region) !== -1 ? od.region : 'allindia';
    const orderId =
      od.orderId !== undefined && od.orderId !== null && String(od.orderId) !== ''
        ? String(od.orderId)
        : 'NA';
    return 'PNG-' + region.toUpperCase() + '-' + orderId;
  }

  /**
   * Create a shipment record and generate a tracking number (Req 7.6, 7.7).
   *
   * Pure/deterministic by default; all side-effectful seams are injectable:
   *  - opts.generateTrackingNumber(orderDetails) → tracking number (defaults to
   *    defaultTrackingNumber for reproducible tests).
   *  - opts.courierClient.createShipment(record) → optional; when provided, the
   *    record is registered with the courier so getTracking can later return
   *    matching info (round-trip property). The courier may return its own
   *    tracking number, which takes precedence.
   *  - opts.now → timestamp (ms) for createdAt (defaults to Date.now()).
   *
   * @param {Object} orderDetails - { orderId, region, items, address, ... }
   * @param {Object} [opts]
   * @returns {{success:boolean, shipment:Object}}
   */
  function createShipment(orderDetails, opts) {
    opts = opts || {};
    const od = orderDetails || {};
    const region =
      REGIONS.indexOf(od.region) !== -1 ? od.region : determineRegion(od.postalCode) || 'allindia';

    const genFn =
      typeof opts.generateTrackingNumber === 'function'
        ? opts.generateTrackingNumber
        : defaultTrackingNumber;
    let trackingNumber = genFn(Object.assign({}, od, { region: region }));

    const createdAt = typeof opts.now === 'number' ? opts.now : Date.now();

    const shipment = {
      trackingNumber: trackingNumber,
      orderId: od.orderId !== undefined ? od.orderId : null,
      region: region,
      items: Array.isArray(od.items) ? od.items.slice() : [],
      address: od.address || null,
      status: 'created',
      createdAt: createdAt
    };

    // Optional courier integration seam (Req 7.6). If the courier returns its
    // own tracking number, prefer it and keep the record consistent.
    if (opts.courierClient && typeof opts.courierClient.createShipment === 'function') {
      const courierResult = opts.courierClient.createShipment(shipment);
      if (courierResult && courierResult.trackingNumber) {
        shipment.trackingNumber = courierResult.trackingNumber;
      }
    }

    return { success: true, shipment: shipment };
  }

  /**
   * Look up tracking information for a tracking number (Req 7.7, 7.8).
   *
   * The courier lookup is an injectable seam: `opts.courierClient.getTracking(
   * trackingNumber)` returns the courier's record. With no courier client, a
   * minimal stub is returned echoing the tracking number with status 'unknown'.
   *
   * @param {string} trackingNumber
   * @param {Object} [opts] - { courierClient }
   * @returns {{found:boolean, tracking:Object|null}}
   */
  function getTracking(trackingNumber, opts) {
    opts = opts || {};
    const tn =
      trackingNumber !== undefined && trackingNumber !== null ? String(trackingNumber) : '';
    if (tn === '') {
      return { found: false, tracking: null };
    }

    if (opts.courierClient && typeof opts.courierClient.getTracking === 'function') {
      const info = opts.courierClient.getTracking(tn);
      if (info) {
        return { found: true, tracking: info };
      }
      return { found: false, tracking: null };
    }

    // No courier client available: return a best-effort stub.
    return { found: false, tracking: { trackingNumber: tn, status: 'unknown' } };
  }

  /**
   * Create a deterministic, in-memory courier client used as the injectable
   * seam for both createShipment and getTracking. This keeps the round-trip
   * property (create → track → query returns matching info, Req 7) testable
   * without any network access.
   *
   * The client stores shipment records keyed by tracking number and returns the
   * same record (augmented with a status) on lookup.
   *
   * @returns {{createShipment:Function, getTracking:Function, _store:Object}}
   */
  function createInMemoryCourier() {
    const store = Object.create(null);
    return {
      _store: store,
      createShipment: function (shipment) {
        const tn = shipment && shipment.trackingNumber;
        if (!tn) {
          return null;
        }
        store[tn] = {
          trackingNumber: tn,
          orderId: shipment.orderId !== undefined ? shipment.orderId : null,
          region: shipment.region || null,
          items: Array.isArray(shipment.items) ? shipment.items.slice() : [],
          status: 'in_transit',
          createdAt: shipment.createdAt || null
        };
        return { trackingNumber: tn };
      },
      getTracking: function (trackingNumber) {
        const rec = store[trackingNumber];
        return rec ? Object.assign({}, rec) : null;
      }
    };
  }

  return {
    determineRegion: determineRegion,
    getAvailableMethods: getAvailableMethods,
    getMethodsForPostalCode: getMethodsForPostalCode,
    fetchShippingQuote: fetchShippingQuote,
    createShipment: createShipment,
    getTracking: getTracking,
    createInMemoryCourier: createInMemoryCourier,
    defaultTrackingNumber: defaultTrackingNumber,
    // Constants / helpers exposed for reuse and tests.
    REGIONS: REGIONS,
    REGION_METHODS: REGION_METHODS,
    DEFAULT_QUOTES: DEFAULT_QUOTES,
    LOCAL_PIN_MIN: LOCAL_PIN_MIN,
    LOCAL_PIN_MAX: LOCAL_PIN_MAX,
    TN_PIN_MIN: TN_PIN_MIN,
    TN_PIN_MAX: TN_PIN_MAX
  };
});
