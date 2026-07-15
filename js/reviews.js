/**
 * reviews.js — Product Reviews & Ratings (Punnagai Toy Store)
 *
 * Responsibilities:
 *  - Purchase verification: user must have a completed/confirmed order
 *    containing the product before they can leave a review.
 *  - Load and display reviews from Firestore `reviews` collection.
 *  - Render aggregate star rating (avg + count).
 *  - Render individual review cards.
 *  - Handle review submission (auth-guarded + purchase-verified).
 *
 * Firestore schema for `reviews/{reviewId}`:
 *   { productId, userId, displayName, rating (1-5), comment, createdAt }
 */

// ============================================================
// STAR RENDERING HELPERS
// ============================================================

/**
 * Generate SVG star icons for a given rating (0–5, supports halves).
 * @param {number} rating - Numeric rating (e.g. 4.3)
 * @param {string} [size='16'] - SVG width/height in px
 * @returns {string} HTML string of star SVGs
 */
function renderStars(rating, size = '16') {
  const filled = Math.floor(rating);
  const half = rating - filled >= 0.5;
  const empty = 5 - filled - (half ? 1 : 0);
  const starColor = '#f59e0b';
  const emptyColor = '#d1d5db';
  const gradId = 'hg' + Math.random().toString(36).slice(2, 6);

  const filledStar = () => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${starColor}" aria-hidden="true"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`;
  const halfStar  = () => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><defs><linearGradient id="${gradId}"><stop offset="50%" stop-color="${starColor}"/><stop offset="50%" stop-color="${emptyColor}"/></linearGradient></defs><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="url(#${gradId})"/></svg>`;
  const emptyStar = () => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${emptyColor}" aria-hidden="true"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>`;

  let html = '<span class="star-row">';
  for (let i = 0; i < filled; i++) html += filledStar();
  if (half) html += halfStar();
  for (let i = 0; i < empty; i++) html += emptyStar();
  html += '</span>';
  return html;
}

// ============================================================
// PURCHASE VERIFICATION
// ============================================================

/**
 * Check whether the current user has a confirmed/shipped/delivered order
 * that contains the given productId.
 * @param {string} productId
 * @returns {Promise<boolean>}
 */
async function hasUserPurchasedProduct(productId) {
  try {
    const user = firebase.auth().currentUser;
    if (!user) return false;

    let orders = [];
    if (typeof getOrdersByUser === 'function') {
      orders = await getOrdersByUser(user.uid);
    } else if (typeof db !== 'undefined') {
      const snap = await db.collection('orders').where('userId', '==', user.uid).get();
      orders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const verifiedStatuses = ['confirmed', 'shipped', 'delivered'];
    return orders.some(order => {
      if (!verifiedStatuses.includes(order.orderStatus)) return false;
      const items = Array.isArray(order.items) ? order.items : [];
      return items.some(item => item.productId === productId || item.id === productId);
    });
  } catch (err) {
    console.error('[reviews] hasUserPurchasedProduct error:', err);
    return false;
  }
}

// ============================================================
// LOAD & RENDER REVIEWS
// ============================================================

async function fetchReviews(productId) {
  try {
    if (typeof db === 'undefined') return [];
    const snap = await db.collection('reviews')
      .where('productId', '==', productId)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('[reviews] fetchReviews:', err.message);
    return [];
  }
}

function renderReviewCard(review) {
  const initials = (review.displayName || 'A')
    .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  const date = review.createdAt
    ? new Date(
        review.createdAt.seconds ? review.createdAt.seconds * 1000 : review.createdAt
      ).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  return `
    <div class="review-card">
      <div class="review-header">
        <div class="review-avatar" aria-hidden="true">${initials}</div>
        <div class="review-meta">
          <span class="review-name">${review.displayName || 'Anonymous'}</span>
          <div class="review-stars-date">
            ${renderStars(review.rating, '14')}
            ${date ? `<span class="review-date">${date}</span>` : ''}
          </div>
        </div>
      </div>
      ${review.comment ? `<p class="review-comment">${review.comment}</p>` : ''}
    </div>`;
}

function renderAggregateRating(reviews) {
  if (!reviews.length) return '';
  const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const avgRounded = Math.round(avg * 10) / 10;
  return `
    <div class="review-aggregate">
      <span class="review-avg-score">${avgRounded}</span>
      ${renderStars(avgRounded, '22')}
      <span class="review-count">${reviews.length} review${reviews.length !== 1 ? 's' : ''}</span>
    </div>`;
}

// ============================================================
// STAR PICKER (interactive form)
// ============================================================

function renderStarPicker() {
  return `
    <div class="star-picker" id="star-picker" role="group" aria-label="Choose your rating">
      ${[1,2,3,4,5].map(n => `
        <button type="button" class="star-pick-btn" data-value="${n}"
                aria-label="${n} star${n > 1 ? 's' : ''}"
                onclick="handleStarPick(${n})">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#d1d5db" aria-hidden="true">
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
          </svg>
        </button>`).join('')}
    </div>
    <input type="hidden" id="review-rating-val" value="0">`;
}

window.handleStarPick = function(value) {
  document.getElementById('review-rating-val').value = value;
  document.querySelectorAll('.star-pick-btn').forEach((btn, idx) => {
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', idx < value ? '#f59e0b' : '#d1d5db');
  });
};

// ============================================================
// SUBMIT REVIEW
// ============================================================

window.submitReview = async function(productId) {
  const submitBtn = document.getElementById('review-submit-btn');
  const errorEl   = document.getElementById('review-error');
  const rating    = parseInt(document.getElementById('review-rating-val').value) || 0;
  const comment   = (document.getElementById('review-comment').value || '').trim();

  if (errorEl) errorEl.textContent = '';

  if (rating < 1 || rating > 5) {
    if (errorEl) errorEl.textContent = 'Please select a star rating (1–5).';
    return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
    if (errorEl) errorEl.textContent = 'Please log in to submit a review.';
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Submitting…'; }

  try {
    const purchased = await hasUserPurchasedProduct(productId);
    if (!purchased) {
      if (errorEl) errorEl.textContent = 'You can only review products you have purchased.';
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Review'; }
      return;
    }

    await db.collection('reviews').add({
      productId,
      userId:      user.uid,
      displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Customer'),
      rating,
      comment,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    });

    await initReviewsSection(productId);
    if (typeof showToast === 'function') showToast('Review submitted! Thank you 🙏', 'success');
  } catch (err) {
    console.error('[reviews] submitReview error:', err);
    if (errorEl) errorEl.textContent = 'Could not submit review. Please try again.';
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Review'; }
  }
};

// ============================================================
// MAIN ENTRY POINT
// ============================================================

window.initReviewsSection = async function initReviewsSection(productId) {
  const container = document.getElementById('reviews-section');
  if (!container) return;

  container.innerHTML = '<div class="reviews-loading"><div class="loading-spinner"></div></div>';

  const reviews = await fetchReviews(productId);

  const user = await new Promise(resolve => {
    const unsub = firebase.auth().onAuthStateChanged(u => { unsub(); resolve(u); });
  });

  let canReview = false;
  let hasPurchased = false;
  if (user) {
    hasPurchased = await hasUserPurchasedProduct(productId);
    const alreadyReviewed = reviews.some(r => r.userId === user.uid);
    canReview = hasPurchased && !alreadyReviewed;
  }

  // Form block
  let formHtml;
  if (!user) {
    formHtml = `
      <div class="review-cta-box">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <p>Have this toy? <a href="login.html" class="review-login-link">Log in</a> to share your review.</p>
      </div>`;
  } else if (!hasPurchased) {
    formHtml = `
      <div class="review-cta-box">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>Reviews are for <strong>verified buyers</strong> only. Purchase this toy to unlock reviews!</p>
      </div>`;
  } else if (!canReview) {
    formHtml = `
      <div class="review-cta-box review-cta-success">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <p>You've already reviewed this product. Thank you!</p>
      </div>`;
  } else {
    formHtml = `
      <div class="review-form-card">
        <h4 class="review-form-title">Write a Review</h4>
        <div class="review-form-group">
          <label class="review-form-label">Your Rating</label>
          ${renderStarPicker()}
        </div>
        <div class="review-form-group">
          <label class="review-form-label" for="review-comment">Your Review <span class="review-optional">(optional)</span></label>
          <textarea id="review-comment" class="review-textarea" rows="4"
                    placeholder="What did your child enjoy most? Any tips for other parents?"></textarea>
        </div>
        <p class="review-error" id="review-error" role="alert" aria-live="polite"></p>
        <button id="review-submit-btn" class="btn btn-primary review-submit-btn"
                onclick="submitReview('${productId}')">
          Submit Review
        </button>
      </div>`;
  }

  // Reviews list
  const listHtml = reviews.length
    ? reviews.map(renderReviewCard).join('')
    : `<div class="review-empty">
         <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="1.5" aria-hidden="true">
           <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
         </svg>
         <p>No reviews yet — be the first to share your experience!</p>
       </div>`;

  container.innerHTML = `
    <div class="reviews-section-inner">
      <div class="reviews-header">
        <h2 class="reviews-title">Customer Reviews</h2>
        ${renderAggregateRating(reviews)}
      </div>
      <div class="reviews-body">
        <div class="reviews-list">${listHtml}</div>
        <div class="reviews-form-col">${formHtml}</div>
      </div>
    </div>`;
};

window.renderStars = renderStars;
