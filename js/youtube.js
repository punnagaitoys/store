/**
 * youtube.js - YouTube Player for Brand Content (Req 19)
 */

class PunnagaiYouTube {
  constructor(config = {}) {
    this.containerId = config.containerId || 'youtube-container';
    this.videoId = config.videoId || 'dQw4w9WgXcQ'; // Default fallback
    this.playlistId = config.playlistId || null;
    this.title = config.title || 'Punnagai Toys Features';
    this.description = config.description || 'Watch our latest toy demonstrations and features.';
  }

  render() {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    let src = `https://www.youtube.com/embed/${this.videoId}?rel=0`;
    if (this.playlistId) {
      src = `https://www.youtube.com/embed/videoseries?list=${this.playlistId}&rel=0`;
    }

    container.innerHTML = `
      <div class="youtube-wrapper">
        <div class="youtube-responsive-container" style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 12px; margin-bottom: 12px;">
          <iframe 
            src="${src}" 
            title="${this.title}" 
            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen
            loading="lazy">
          </iframe>
        </div>
        <div class="youtube-meta">
          <h3 class="youtube-title" style="margin: 0 0 4px 0; font-size: 1.25rem;">${this.title}</h3>
          <p class="youtube-desc" style="margin: 0; color: var(--text-secondary);">${this.description}</p>
        </div>
      </div>
    `;
  }
}

window.PunnagaiYouTube = PunnagaiYouTube;
