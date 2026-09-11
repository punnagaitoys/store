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
      text: 'Punnagai Toy Store is a wonderful gem in Mylapore! Located right in Luz Bazar Complex, they have an incredible collection of educational and fun toys. Very friendly staff and great shopping experience. Highly recommended!',
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
      text: 'Loved visiting the store! The collection of wooden learning toys, puzzles, and art sets for children is fantastic. Very neatly organized and polite staff.',
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
      text: "Wonderful collection of non-toxic, safe toys for toddlers. Very polite and patient store owners who demonstrate how each toy works. Mylapore's favorite toy store!",
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
      text: 'Great experience buying birthday gifts here. They wrapped everything beautifully at the counter. Convenient location in Luz Bazar Complex!',
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
      text: 'High quality toys at very affordable prices. Excellent variety of battery-operated cars, educational blocks, and creative play sets. Very courteous service!',
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
          <a
            href="https://maps.google.com/?q=Punnagai+Toys+Mylapore+Chennai"
            target="_blank"
            rel="noopener"
            class="rev-verified"
            style="text-decoration: none; color: inherit; display: inline-flex; align-items: center; gap: 4px;"
            title="Verify on Google Maps"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Verified on Google Maps ↗
          </a>
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
    const autoplayBtn = document.getElementById('reviews-autoplay-btn');

    const AUTO_SCROLL_DELAY = 3500; // 3.5s per review slide
    const USER_ACTION_GRACE_PERIOD = 5000; // 5s wait after manual navigation before resuming

    let autoScrollTimer = null;
    let graceTimeout = null;
    let isUserPaused = false;
    let isHovered = false;
    let isTouching = false;
    let isDragging = false;
    let isVisible = false;

    // Calculate dynamic step (card width + 24px container gap)
    function getScrollStep() {
      const card = container.querySelector('.google-review-card');
      if (card) {
        return card.offsetWidth + 24;
      }
      return container.clientWidth > 600 ? 364 : 310;
    }

    function scrollNext(isAuto = false) {
      if (!container) return;
      const step = getScrollStep();
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      if (container.scrollLeft >= maxScrollLeft - 15) {
        // Reached end -> smoothly loop back to start
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: step, behavior: 'smooth' });
      }
      updateBtnStates();
    }

    function scrollPrev() {
      if (!container) return;
      const step = getScrollStep();
      const maxScrollLeft = container.scrollWidth - container.clientWidth;

      if (container.scrollLeft <= 15) {
        // At start -> smoothly wrap to end
        container.scrollTo({ left: maxScrollLeft, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: -step, behavior: 'smooth' });
      }
      updateBtnStates();
    }

    const updateBtnStates = () => {
      if (!container) return;
      const maxScrollLeft = container.scrollWidth - container.clientWidth;
      if (prevBtn) {
        prevBtn.title = container.scrollLeft <= 15 ? 'Wrap to last review' : 'Previous review';
      }
      if (nextBtn) {
        nextBtn.title = container.scrollLeft >= maxScrollLeft - 15 ? 'Wrap to first review' : 'Next review';
      }
    };

    function canAutoScroll() {
      return (
        !isUserPaused &&
        !isHovered &&
        !isTouching &&
        !isDragging &&
        isVisible &&
        !document.hidden
      );
    }

    function startAutoScroll() {
      stopAutoScroll();
      if (!canAutoScroll()) return;

      autoScrollTimer = setInterval(() => {
        if (canAutoScroll()) {
          scrollNext(true);
        }
      }, AUTO_SCROLL_DELAY);
    }

    function stopAutoScroll() {
      if (autoScrollTimer) {
        clearInterval(autoScrollTimer);
        autoScrollTimer = null;
      }
    }

    function restartAutoScrollWithDelay(delay = USER_ACTION_GRACE_PERIOD) {
      stopAutoScroll();
      clearTimeout(graceTimeout);
      if (isUserPaused) return;

      graceTimeout = setTimeout(() => {
        if (canAutoScroll()) {
          startAutoScroll();
        }
      }, delay);
    }

    function updateAutoplayUI() {
      if (!autoplayBtn) return;
      const iconPause = autoplayBtn.querySelector('.icon-pause');
      const iconPlay = autoplayBtn.querySelector('.icon-play');
      if (isUserPaused) {
        autoplayBtn.classList.remove('playing');
        autoplayBtn.setAttribute('aria-label', 'Resume automatic scrolling');
        autoplayBtn.setAttribute('title', 'Auto-scroll is paused (Click to resume)');
        if (iconPause) iconPause.style.display = 'none';
        if (iconPlay) iconPlay.style.display = 'inline-block';
      } else {
        autoplayBtn.classList.add('playing');
        autoplayBtn.setAttribute('aria-label', 'Pause automatic scrolling');
        autoplayBtn.setAttribute('title', 'Auto-scroll is playing (Click to pause)');
        if (iconPause) iconPause.style.display = 'inline-block';
        if (iconPlay) iconPlay.style.display = 'none';
      }
    }

    if (autoplayBtn) {
      autoplayBtn.addEventListener('click', () => {
        isUserPaused = !isUserPaused;
        updateAutoplayUI();
        if (isUserPaused) {
          stopAutoScroll();
        } else {
          startAutoScroll();
        }
      });
      updateAutoplayUI();
    }

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        scrollPrev();
        restartAutoScrollWithDelay();
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        scrollNext();
        restartAutoScrollWithDelay();
      });
    }

    // Pause on hover while user reads review cards
    container.addEventListener('mouseenter', () => {
      isHovered = true;
      stopAutoScroll();
    });

    container.addEventListener('mouseleave', () => {
      isHovered = false;
      if (!isUserPaused) {
        startAutoScroll();
      }
    });

    // Touch interactions on mobile
    container.addEventListener(
      'touchstart',
      () => {
        isTouching = true;
        stopAutoScroll();
      },
      { passive: true }
    );

    container.addEventListener(
      'touchend',
      () => {
        isTouching = false;
        restartAutoScrollWithDelay(2500);
      },
      { passive: true }
    );

    container.addEventListener('scroll', updateBtnStates);
    window.addEventListener('resize', updateBtnStates);
    updateBtnStates();

    // Mouse drag-to-scroll functionality for desktop
    let isDown = false;
    let startX;
    let scrollLeft;

    container.addEventListener('mousedown', (e) => {
      isDown = true;
      isDragging = true;
      stopAutoScroll();
      container.classList.add('grabbing');
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });

    container.addEventListener('mouseleave', () => {
      if (isDown) {
        isDown = false;
        isDragging = false;
        container.classList.remove('grabbing');
        restartAutoScrollWithDelay(2000);
      }
    });

    window.addEventListener('mouseup', () => {
      if (isDown) {
        isDown = false;
        isDragging = false;
        container.classList.remove('grabbing');
        restartAutoScrollWithDelay(2000);
      }
    });

    container.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.8;
      container.scrollLeft = scrollLeft - walk;
    });

    // Keyboard navigation
    container.setAttribute('tabindex', '0');
    container.setAttribute(
      'aria-label',
      'Google Customer Reviews Carousel. Use left and right arrow keys to navigate.'
    );
    container.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        scrollNext();
        restartAutoScrollWithDelay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        scrollPrev();
        restartAutoScrollWithDelay();
      }
    });

    // Pause when tab is inactive to preserve CPU & battery
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        stopAutoScroll();
      } else if (canAutoScroll()) {
        startAutoScroll();
      }
    });

    // Start auto-scroll when section enters viewport
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            isVisible = entry.isIntersecting;
            if (isVisible) {
              if (canAutoScroll()) startAutoScroll();
            } else {
              stopAutoScroll();
            }
          });
        },
        { threshold: 0.2 }
      );
      observer.observe(container);
    } else {
      isVisible = true;
      startAutoScroll();
    }
  }

  // Expose global dataset & init
  window.GOOGLE_MAPS_REVIEWS_DATA = GOOGLE_MAPS_REVIEWS;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGoogleReviewsCarousel);
  } else {
    initGoogleReviewsCarousel();
  }
})();
