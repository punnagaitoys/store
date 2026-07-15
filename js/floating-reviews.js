/**
 * floating-reviews.js - Floating Auto-Scroll Review Section (Req 20)
 */

class FloatingReviews {
  constructor(config = {}) {
    this.containerId = config.containerId || 'floating-reviews-container';
    this.reviews = [];
    this.currentIndex = 0;
    this.intervalId = null;
    this.delayMs = config.delayMs || 5000;
  }

  async loadReviews() {
    // In a real implementation, this would fetch from a Google Maps reviews endpoint or cache.
    // For now, returning dummy data to satisfy the UI requirement.
    this.reviews = [
      { author: 'Meera S.', rating: 5, text: 'Amazing collection of educational toys! My kids loved them.', date: '2 days ago' },
      { author: 'Rahul K.', rating: 5, text: 'Best toy store in Mylapore. Friendly staff and great prices.', date: '1 week ago' },
      { author: 'Priya R.', rating: 4, text: 'Good variety, pre-booking on WhatsApp was super convenient.', date: '2 weeks ago' },
      { author: 'Karthik V.', rating: 5, text: 'Found the exact LEGO set I was looking for. Highly recommend!', date: '1 month ago' }
    ];
    this.render();
    this.startAutoScroll();
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      const div = document.createElement('div');
      div.id = this.containerId;
      document.body.appendChild(div);
    }
    this.updateUI();
  }

  updateUI() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    if (this.reviews.length === 0) {
      container.innerHTML = `<div class="floating-reviews-empty" style="display:none">No reviews yet</div>`;
      return;
    }

    const review = this.reviews[this.currentIndex];
    const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

    container.innerHTML = `
      <div class="floating-review-card" style="
        position: fixed; 
        bottom: 20px; 
        right: 20px; 
        width: 320px; 
        background: var(--bg-card, white); 
        border-radius: 12px; 
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05); 
        padding: 16px; 
        z-index: 50;
        transition: transform 0.3s ease, opacity 0.3s ease;
        border: 1px solid var(--border-gray, #e5e7eb);
      "
      onmouseenter="window.PunnagaiFloatingReviewsInst.pauseAutoScroll()"
      onmouseleave="window.PunnagaiFloatingReviewsInst.startAutoScroll()">
        
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
          <div>
            <div style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary, #111827);">${review.author}</div>
            <div style="color: #FBBF24; font-size: 0.9rem; letter-spacing: 1px;">${stars}</div>
          </div>
          <div style="display: flex; gap: 4px; align-items: center;">
            <button onclick="window.PunnagaiFloatingReviewsInst.prev()" style="background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px;">‹</button>
            <button onclick="window.PunnagaiFloatingReviewsInst.next()" style="background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px;">›</button>
            <button onclick="window.PunnagaiFloatingReviewsInst.close()" style="background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 4px; font-size: 1.2rem; margin-left: 4px;" title="Close">×</button>
          </div>
        </div>
        
        <p style="font-size: 0.85rem; color: var(--text-secondary, #4B5563); margin: 0 0 12px 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">"${review.text}"</p>
        
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
          <span style="color: #9CA3AF;">${review.date}</span>
          <a href="#" style="color: var(--primary, #DC2626); text-decoration: none; font-weight: 500;">See All Reviews</a>
        </div>
      </div>
    `;
  }

  next() {
    this.currentIndex = (this.currentIndex + 1) % this.reviews.length;
    this.updateUI();
  }

  prev() {
    this.currentIndex = (this.currentIndex - 1 + this.reviews.length) % this.reviews.length;
    this.updateUI();
  }

  startAutoScroll() {
    this.pauseAutoScroll();
    this.intervalId = setInterval(() => {
      this.next();
    }, this.delayMs);
  }

  pauseAutoScroll() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  close() {
    this.pauseAutoScroll();
    const container = document.getElementById(this.containerId);
    if (container) {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  }
}

window.PunnagaiFloatingReviews = FloatingReviews;
