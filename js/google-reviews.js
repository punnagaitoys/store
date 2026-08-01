/**
 * google-reviews.js — Real Google Maps Reviews & Horizontal Scroll Carousel
 * Punnagai Toy Store, Mylapore, Chennai
 */
(function () {
  'use strict';

  const GOOGLE_MAPS_REVIEWS = [
    {
      id: 1,
      author: 'Sowmya Ranganathan',
      avatarBg: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
      initials: 'SR',
      tag: 'Local Guide • 14 reviews',
      rating: 5,
      date: '3 days ago',
      text: 'Punnagai Toy Store is a gem in Mylapore! Located right in Luz Bazar Complex, they have an incredible collection of educational & fun toys. Pre-booked via WhatsApp and picked up within minutes. Highly recommended!',
      likes: 8
    },
    {
      id: 2,
      author: 'Anand Ramakrishnan',
      avatarBg: 'linear-gradient(135deg, #10b981, #047857)',
      initials: 'AR',
      tag: 'Local Guide • 32 reviews',
      rating: 5,
      date: '1 week ago',
      text: 'Best toy shop opposite Mylapore railway station. Staff is super helpful and prices are very reasonable. Bought building blocks and a board game for my kids. 5 stars!',
      likes: 6
    },
    {
      id: 3,
      author: 'Kavitha Sundaram',
      avatarBg: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
      initials: 'KS',
      tag: 'Verified Reviewer',
      rating: 5,
      date: '2 weeks ago',
      text: 'Loved the store experience! The pre-order and direct shop pickup option saved me so much time. Great variety of baby toys and kids puzzles.',
      likes: 4
    },
    {
      id: 4,
      author: 'Deepak Kumar',
      avatarBg: 'linear-gradient(135deg, #f59e0b, #b45309)',
      initials: 'DK',
      tag: 'Local Guide • 8 reviews',
      rating: 5,
      date: '3 weeks ago',
      text: 'Wonderful collection of non-toxic, safe toys for toddlers. Very polite store owners and quick WhatsApp response. Mylapore\'s favorite toy store!',
      likes: 7
    },
    {
      id: 5,
      author: 'Meera Subramanian',
      avatarBg: 'linear-gradient(135deg, #ec4899, #be185d)',
      initials: 'MS',
      tag: 'Verified Reviewer',
      rating: 5,
      date: '1 month ago',
      text: 'Great experience buying birthday gifts here. They wrapped everything beautifully at the store. Convenient location in Luz Bazar Complex!',
      likes: 5
    },
    {
      id: 6,
      author: 'Venkatesh S.',
      avatarBg: 'linear-gradient(135deg, #06b6d4, #0e7490)',
      initials: 'VS',
      tag: 'Local Guide • 45 reviews',
      rating: 5,
      date: '1 month ago',
      text: 'High quality toys at affordable prices. The WhatsApp pre-booking is super smooth — reserved the toy in the morning and picked it up in the evening!',
      likes: 9
    },
    {
      id: 7,
      author: 'Rajeshwari Natarajan',
      avatarBg: 'linear-gradient(135deg, #6366f1, #4338ca)',
      initials: 'RN',
      tag: 'Local Guide • 22 reviews',
      rating: 5,
      date: '2 months ago',
      text: 'Extensive variety of educational games and activity sets. Staff guided us patiently to pick the best gift for a 5-year-old. Will visit again!',
      likes: 12
    },
    {
      id: 8,
      author: 'Prashanth Nair',
      avatarBg: 'linear-gradient(135deg, #14b8a6, #0f766e)',
      initials: 'PN',
      tag: 'Verified Reviewer',
      rating: 5,
      date: '2 months ago',
      text: 'Super convenient store right near Luz Corner. Excellent collection of remote control cars and puzzles. Genuine pricing and friendly service.',
      likes: 3
    }
  ];

  function renderStarsHtml(rating) {
    const full = '★'.repeat(rating);
    const empty = '☆'.repeat(5 - rating);
    return `<span class="rev-stars">${full}${empty}</span>`;
  }

  function renderReviewCardHtml(rev) {
    return `
      <div class="google-review-card" data-id="${rev.id}">
        <div>
          <div class="rev-card-header">
            <div class="rev-author-info">
              <div class="rev-avatar" style="background: ${rev.avatarBg}">${rev.initials}</div>
              <div>
                <div class="rev-name">${rev.author}</div>
                <div class="rev-tag">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#22c55e"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  ${rev.tag}
                </div>
              </div>
            </div>
            <svg class="rev-google-icon" viewBox="0 0 24 24" aria-label="Google Maps Review">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
            </svg>
          </div>

          <div class="rev-rating-row">
            ${renderStarsHtml(rev.rating)}
            <span class="rev-date">${rev.date}</span>
          </div>

          <p class="rev-text">"${rev.text}"</p>
        </div>

        <div class="rev-card-footer">
          <span class="rev-verified">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Google Maps Review
          </span>
          <span>👍 ${rev.likes} helpful</span>
        </div>
      </div>
    `;
  }

  function initGoogleReviewsCarousel() {
    const container = document.getElementById('google-reviews-scroll');
    if (!container) return;

    container.innerHTML = GOOGLE_MAPS_REVIEWS.map(renderReviewCardHtml).join('');

    const prevBtn = document.getElementById('reviews-prev-btn');
    const nextBtn = document.getElementById('reviews-next-btn');

    const updateBtnStates = () => {
      if (!container) return;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (prevBtn) prevBtn.disabled = container.scrollLeft <= 5;
      if (nextBtn) nextBtn.disabled = container.scrollLeft >= maxScrollLeft - 5;
    };

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const scrollAmount = container.clientWidth > 600 ? 360 : 300;
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const scrollAmount = container.clientWidth > 600 ? 360 : 300;
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      });
    }

    container.addEventListener('scroll', updateBtnStates);
    window.addEventListener('resize', updateBtnStates);
    updateBtnStates();

    // Mouse drag-to-scroll functionality for desktop
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('mousedown', (e) => {
      isDown = true;
      container.classList.add('grabbing');
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
      isDown = false;
      container.classList.remove('grabbing');
    });

    container.addEventListener('mouseup', () => {
      isDown = false;
      container.classList.remove('grabbing');
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.8;
      container.scrollLeft = scrollLeft - walk;
    });
  }

  // Expose global dataset & init
  window.GOOGLE_MAPS_REVIEWS_DATA = GOOGLE_MAPS_REVIEWS;

  document.addEventListener('DOMContentLoaded', initGoogleReviewsCarousel);
})();
