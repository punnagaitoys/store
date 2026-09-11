/**
 * youtube.js - YouTube Player & Interactive Video Gallery for Home Page (Req 19)
 * Supports multiple YouTube demonstration videos managed by the Admin.
 */

const DEFAULT_HOME_VIDEOS = [
  {
    id: 'hv_1',
    videoId: 'AbUoC01edxY',
    title: 'Punnagai Toys Welcome Video',
    description:
      'Welcome to Punnagai Toys & Fancy Store, Mylapore, Chennai. Explore our massive curated toy collection!'
  },
  {
    id: 'hv_2',
    videoId: 'F3I3MFQY8PU',
    title: 'Elephant with Floating Air Ball Toy',
    description:
      'Interactive musical elephant blowing floating air balls. Pre-book or enquire via WhatsApp +91 75501 32101.'
  },
  {
    id: 'hv_3',
    videoId: 'G2muNGkuW-4',
    title: 'Swinging Bee Musical Toy',
    description:
      'Fun animated swinging bee toy with delightful music, movement, and dancing lights for kids.'
  },
  {
    id: 'hv_4',
    videoId: '50W7p72rY1w',
    title: 'Thomas Train with Real Smoke',
    description:
      'Exciting classic locomotive train playset featuring realistic steam smoke and authentic train sounds.'
  },
  {
    id: 'hv_5',
    videoId: '5Ivt3rftkaA',
    title: 'Exciting Kids Toys & Demonstrations',
    description:
      'Live demonstration of popular interactive toys and learning games at Punnagai Toys, Mylapore.'
  }
];

class PunnagaiYouTube {
  constructor(config = {}) {
    this.containerId = config.containerId || 'youtube-container';
    this.currentIndex = 0;
  }

  getVideos() {
    try {
      const stored = localStorage.getItem('Punnagai_HomeVideos');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          Array.isArray(parsed) &&
          parsed.length > 0 &&
          parsed[0].videoId !== 'dQw4w9WgXcQ' &&
          parsed[0].videoId !== 'L13c2yTfZ8c'
        ) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading Home Videos from localStorage', e);
    }
    // Save default if none found or legacy placeholder
    try {
      localStorage.setItem('Punnagai_HomeVideos', JSON.stringify(DEFAULT_HOME_VIDEOS));
    } catch (e) {}
    return DEFAULT_HOME_VIDEOS;
  }

  selectVideo(index) {
    const videos = this.getVideos();
    if (index < 0 || index >= videos.length) return;
    this.currentIndex = index;
    this.render();

    // Smooth scroll slightly towards the player on mobile
    const container = document.getElementById(this.containerId);
    if (container) {
      container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const videos = this.getVideos();
    if (!videos || videos.length === 0) {
      container.innerHTML = `
        <div class="youtube-placeholder">
          <p>No video demonstrations available at the moment.</p>
        </div>
      `;
      return;
    }

    if (this.currentIndex >= videos.length) {
      this.currentIndex = 0;
    }

    const featured = videos[this.currentIndex];
    const src = `https://www.youtube.com/embed/${featured.videoId}?rel=0&autoplay=0`;

    let html = `
      <div class="youtube-gallery-wrapper">
        <!-- Featured Main Video Player -->
        <div class="youtube-featured-card">
          <div class="youtube-responsive-container">
            <iframe 
              src="${src}" 
              title="${featured.title}" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen
              loading="lazy">
            </iframe>
          </div>
          <div class="youtube-meta">
            <div class="youtube-meta-header">
              <span class="youtube-demo-badge">🎬 FEATURED DEMONSTRATION</span>
              ${videos.length > 1 ? `<span class="youtube-count-badge">${this.currentIndex + 1} of ${videos.length} Videos</span>` : ''}
            </div>
            <h3 class="youtube-title">${featured.title}</h3>
            ${featured.description ? `<p class="youtube-desc">${featured.description}</p>` : ''}
          </div>
        </div>
    `;

    // Interactive Playlist Gallery Grid (if more than 1 video)
    if (videos.length > 1) {
      html += `
        <div class="youtube-playlist-section">
          <h4 class="youtube-playlist-heading">More Toy Demonstrations (${videos.length})</h4>
          <div class="youtube-playlist-grid">
      `;

      videos.forEach((v, idx) => {
        const isActive = idx === this.currentIndex;
        const thumbUrl = `https://img.youtube.com/vi/${v.videoId}/hqdefault.jpg`;
        html += `
          <div class="youtube-playlist-card ${isActive ? 'active-video-card' : ''}" 
               onclick="window.PunnagaiYouTubeInstance && window.PunnagaiYouTubeInstance.selectVideo(${idx})"
               onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();window.PunnagaiYouTubeInstance&&window.PunnagaiYouTubeInstance.selectVideo(${idx});}"
               role="button"
               tabindex="0"
               aria-label="Play ${v.title}">
            <div class="youtube-card-thumb">
              <img src="${thumbUrl}" alt="${v.title}" loading="lazy" onerror="this.src='logo.png'">
              <div class="youtube-play-overlay">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              </div>
              ${isActive ? '<span class="youtube-playing-badge">NOW PLAYING</span>' : ''}
            </div>
            <div class="youtube-card-meta">
              <h5 class="youtube-card-title">${v.title}</h5>
              ${v.description ? `<p class="youtube-card-desc">${v.description}</p>` : ''}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </div>
      `;
    }

    // YouTube Channel Subscribe Bar
    html += `
        <div class="youtube-channel-bar">
          <div class="youtube-channel-branding">
            <span class="youtube-channel-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#FF0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </span>
            <div>
              <h4 class="youtube-channel-title">Official Channel: Punnagai Rahim</h4>
              <p class="youtube-channel-subtitle">Watch interactive toy unboxings, live demos &amp; new arrivals</p>
            </div>
          </div>
          <a href="https://www.youtube.com/@PunnagaiRahim" target="_blank" rel="noopener" class="youtube-subscribe-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            Subscribe @PunnagaiRahim
          </a>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }
}

window.PunnagaiYouTube = PunnagaiYouTube;
window.DEFAULT_HOME_VIDEOS = DEFAULT_HOME_VIDEOS;

if (typeof window !== 'undefined') {
  window.addEventListener('storage', function (e) {
    if (e.key === 'Punnagai_HomeVideos' && window.PunnagaiYouTubeInstance) {
      window.PunnagaiYouTubeInstance.render();
    }
  });
}
