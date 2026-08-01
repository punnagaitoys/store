/**
 * youtube.js - YouTube Player & Interactive Video Gallery for Home Page (Req 19)
 * Supports multiple YouTube demonstration videos managed by the Admin.
 */

const DEFAULT_HOME_VIDEOS = [
  {
    id: 'hv_1',
    videoId: 'dQw4w9WgXcQ',
    title: 'Welcome to Punnagai Toy Store Mylapore',
    description:
      "Take a virtual tour of Mylapore's favorite toy destination and discover our magical range."
  },
  {
    id: 'hv_2',
    videoId: 'M7lc1UVf-VE',
    title: 'Top Educational & STEM Toys for Kids',
    description: 'Discover how learning meets fun with our age-tested STEM and educational toys.'
  },
  {
    id: 'hv_3',
    videoId: 'tgbNymZ7vqY',
    title: 'Wooden Toys & Traditional Games Showcase',
    description: 'Explore eco-friendly wooden toys crafted for safety, creativity and durability.'
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
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading Home Videos from localStorage', e);
    }
    // Save default if none found
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

    html += `
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
