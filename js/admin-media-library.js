/**
 * Punnagai Toy Store — WordPress-Style Media Library
 * Enables admins to manage, search, upload, and easily attach images to products & banners.
 */
(function () {
  const CUSTOM_MEDIA_KEY = 'punnagai_media_library_custom';

  const DEFAULT_MEDIA_ITEMS = [
    {
      id: 'med_1',
      title: 'Remote Control Rally Car',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1594787318286-3d835c1d207f?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-01',
      dimensions: '600x600'
    },
    {
      id: 'med_2',
      title: 'LEGO Classic Building Bricks',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1585366119957-e9730b6d0f60?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-02',
      dimensions: '600x600'
    },
    {
      id: 'med_3',
      title: 'Wooden Alphabet Puzzle Board',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-03',
      dimensions: '600x600'
    },
    {
      id: 'med_4',
      title: 'Plush Teddy Bear Soft Toy',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1559715745-e1b33a271c8f?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-04',
      dimensions: '600x600'
    },
    {
      id: 'med_5',
      title: 'Princess Fashion Doll',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-05',
      dimensions: '600x600'
    },
    {
      id: 'med_6',
      title: 'Stunt Drone Quadcopter',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1527977966376-1c8408f9f108?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-06',
      dimensions: '600x600'
    },
    {
      id: 'med_7',
      title: 'Electronic Musical Keyboard',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-07',
      dimensions: '600x600'
    },
    {
      id: 'med_8',
      title: 'Action Superhero Figure',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-08',
      dimensions: '600x600'
    },
    {
      id: 'med_9',
      title: 'Kids Outdoor Soccer Ball',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1614632537423-1e6c2e7e0aab?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-09',
      dimensions: '600x600'
    },
    {
      id: 'med_10',
      title: 'Deluxe Arts & Crafts Kit',
      category: 'toys',
      url: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&auto=format&fit=crop&q=80',
      date: '2026-07-10',
      dimensions: '600x600'
    },
    {
      id: 'med_11',
      title: 'Storefront Hero Banner 1',
      category: 'banners',
      url: 'https://images.unsplash.com/photo-1566576912321-d58ddd7a6088?w=1200&auto=format&fit=crop&q=80',
      date: '2026-07-11',
      dimensions: '1200x400'
    },
    {
      id: 'med_12',
      title: 'Storefront Hero Banner 2',
      category: 'banners',
      url: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=1200&auto=format&fit=crop&q=80',
      date: '2026-07-12',
      dimensions: '1200x400'
    }
  ];

  class MediaLibraryManager {
    constructor() {
      this.items = [];
      this.activeTargetInput = 'f-image-url';
      this.selectedItem = null;
      this.searchTerm = '';
      this.selectedFilter = 'all';
    }

    init(catalogProducts = []) {
      const customItems = this.getCustomItems();
      const catalogItems = [];

      // Import any product images from catalog that aren't already in default or custom items
      catalogProducts.forEach((p, idx) => {
        if (p && p.image) {
          const exists =
            DEFAULT_MEDIA_ITEMS.some((i) => i.url === p.image) ||
            customItems.some((i) => i.url === p.image) ||
            catalogItems.some((i) => i.url === p.image);
          if (!exists) {
            catalogItems.push({
              id: 'cat_med_' + idx + '_' + Date.now().toString().slice(-4),
              title: p.name || 'Catalog Product ' + (idx + 1),
              category: 'toys',
              url: p.image,
              date: new Date().toISOString().split('T')[0],
              dimensions: '600x600'
            });
          }
        }
      });

      this.items = [...customItems, ...DEFAULT_MEDIA_ITEMS, ...catalogItems];
    }

    getCustomItems() {
      try {
        const raw = localStorage.getItem(CUSTOM_MEDIA_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (e) {
        console.warn('Could not read custom media library items:', e);
        return [];
      }
    }

    saveCustomItems(customItems) {
      try {
        localStorage.setItem(CUSTOM_MEDIA_KEY, JSON.stringify(customItems));
      } catch (e) {
        console.error('Failed to save custom media item:', e);
      }
    }

    addMediaItem({ title, url, category = 'custom', dimensions = '600x600' }) {
      const newItem = {
        id: 'med_cust_' + Date.now(),
        title: title || 'Custom Image ' + new Date().toLocaleDateString(),
        category: category,
        url: url,
        date: new Date().toISOString().split('T')[0],
        dimensions: dimensions,
        isCustom: true
      };

      const customItems = this.getCustomItems();
      customItems.unshift(newItem);
      this.saveCustomItems(customItems);
      this.items.unshift(newItem);

      this.renderMediaGrid();
      this.renderModalGrid();
      if (typeof showToast === 'function') showToast('Image added to Media Library!', 'success');
      return newItem;
    }

    deleteMediaItem(id) {
      const idx = this.items.findIndex((i) => i.id === id);
      if (idx > -1) {
        const item = this.items[idx];
        this.items.splice(idx, 1);
        const customItems = this.getCustomItems().filter((i) => i.id !== id);
        this.saveCustomItems(customItems);
        this.renderMediaGrid();
        this.renderModalGrid();
        if (typeof showToast === 'function') showToast('Image removed from Media Library', 'info');
      }
    }

    getFilteredItems() {
      let filtered = this.items;
      if (this.selectedFilter && this.selectedFilter !== 'all') {
        filtered = filtered.filter((item) => item.category === this.selectedFilter);
      }
      if (this.searchTerm) {
        const query = this.searchTerm.toLowerCase();
        filtered = filtered.filter(
          (item) =>
            (item.title && item.title.toLowerCase().includes(query)) ||
            (item.url && item.url.toLowerCase().includes(query))
        );
      }
      return filtered;
    }

    renderMediaGrid() {
      const grid = document.getElementById('media-library-grid');
      if (!grid) return;

      const items = this.getFilteredItems();
      if (items.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; background: var(--bg-white); border-radius: var(--radius-md); border: 1px dashed var(--border);">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-muted); margin-bottom:12px;"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <h4 style="margin: 0 0 6px 0; color:var(--text);">No Media Images Found</h4>
            <p style="margin: 0; color:var(--text-muted); font-size:14px;">Try adjusting your search filter or upload a new image.</p>
          </div>
        `;
        return;
      }

      grid.innerHTML = items
        .map(
          (item) => `
        <div class="media-card" data-id="${item.id}" style="border:1px solid #E5E7EB; border-radius:8px; overflow:hidden; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.05); display:flex; flex-direction:column;">
          <div class="media-card-thumb" style="position:relative; aspect-ratio:1/1; background:#F9FAFB; overflow:hidden;">
            <img src="${item.url}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
            <div class="media-card-hover">
              <button type="button" class="btn btn-sm btn-primary" onclick="window.MediaLibrary.useForProduct('${item.url.replace(/'/g, "\\'")}')" style="font-size:12px; padding:6px 12px; margin-bottom:6px;">
                Use for Product
              </button>
              <button type="button" class="btn btn-sm btn-outline" style="color:#fff; border-color:#fff; font-size:12px; padding:6px 12px; background:rgba(0,0,0,0.5);" onclick="window.MediaLibrary.copyUrl('${item.url.replace(/'/g, "\\'")}')">
                Copy URL
              </button>
            </div>
          </div>
          <div class="media-card-info" style="padding:12px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
            <div style="font-weight:700; font-size:13px; color:#1F2937; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.title}">${item.title}</div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
              <span style="font-size:11px; text-transform:uppercase; background:#FEF2F2; color:#DC2626; padding:2px 6px; border-radius:4px; font-weight:600;">${item.category}</span>
              ${item.isCustom ? `<button type="button" onclick="window.MediaLibrary.deleteItem('${item.id}')" title="Delete Image" style="background:none; border:none; color:#EF4444; cursor:pointer; font-size:13px; padding:0;">🗑️</button>` : ''}
            </div>
          </div>
        </div>
      `
        )
        .join('');
    }

    renderModalGrid() {
      const modalGrid = document.getElementById('media-modal-grid');
      if (!modalGrid) return;

      const items = this.getFilteredItems();
      if (items.length === 0) {
        modalGrid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 36px 20px; color: var(--text-muted);">
            No images match your search. Click "Upload New" to add an image.
          </div>
        `;
        return;
      }

      modalGrid.innerHTML = items
        .map((item) => {
          const isSelected = this.selectedItem && this.selectedItem.url === item.url;
          return `
          <div class="media-modal-item ${isSelected ? 'selected' : ''}" 
               data-id="${item.id}" 
               onclick="window.MediaLibrary.selectModalItem('${item.id}')"
               ondblclick="window.MediaLibrary.confirmSelection('${item.id}')"
               style="cursor:pointer; border:2px solid ${isSelected ? '#DC2626' : 'transparent'}; border-radius:8px; overflow:hidden; position:relative; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.1); transition:all 0.15s ease;">
            <div style="aspect-ratio:1/1; overflow:hidden; background:#F3F4F6;">
              <img src="${item.url}" alt="${item.title}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
            </div>
            <div style="padding:8px; font-size:12px; font-weight:600; color:#374151; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${item.title}">
              ${item.title}
            </div>
            ${
              isSelected
                ? `
              <div style="position:absolute; top:8px; right:8px; background:#DC2626; color:#fff; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);">
                ✓
              </div>
            `
                : ''
            }
          </div>
        `;
        })
        .join('');
    }

    selectModalItem(id) {
      const item = this.items.find((i) => i.id === id);
      if (!item) return;
      this.selectedItem = item;
      this.renderModalGrid();

      const btn = document.getElementById('media-modal-select-btn');
      if (btn) {
        btn.disabled = false;
        btn.textContent = `Use Selected Image (${item.title.slice(0, 20)}${item.title.length > 20 ? '...' : ''})`;
      }
    }

    confirmSelection(id) {
      if (id) {
        const item = this.items.find((i) => i.id === id);
        if (item) this.selectedItem = item;
      }
      if (!this.selectedItem) return;

      const targetInput = document.getElementById(this.activeTargetInput);
      if (targetInput) {
        targetInput.value = this.selectedItem.url;
        // Trigger preview updates
        if (typeof updateImagePreview === 'function') {
          updateImagePreview();
        } else {
          targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }

      this.closeModal();
      if (typeof showToast === 'function')
        showToast('Image connected from Media Library!', 'success');
    }

    openModal(targetInputId = 'f-image-url') {
      this.activeTargetInput = targetInputId;
      this.selectedItem = null;
      const modal = document.getElementById('media-library-modal');
      if (!modal) return;

      modal.style.display = 'flex';
      const btn = document.getElementById('media-modal-select-btn');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Use Selected Image';
      }

      this.renderModalGrid();
    }

    closeModal() {
      const modal = document.getElementById('media-library-modal');
      if (modal) modal.style.display = 'none';
      this.selectedItem = null;
    }

    useForProduct(url) {
      if (typeof showSection === 'function') {
        showSection('add-product');
      }
      const input = document.getElementById('f-image-url');
      if (input) {
        input.value = url;
        if (typeof updateImagePreview === 'function') {
          updateImagePreview();
        }
        input.focus();
      }
      if (typeof showToast === 'function') showToast('Image connected to Product Form!', 'success');
    }

    copyUrl(url) {
      if (navigator.clipboard) {
        navigator.clipboard
          .writeText(url)
          .then(() => {
            if (typeof showToast === 'function')
              showToast('Image URL copied to clipboard!', 'success');
          })
          .catch(() => this.fallbackCopy(url));
      } else {
        this.fallbackCopy(url);
      }
    }

    fallbackCopy(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        if (typeof showToast === 'function') showToast('Image URL copied to clipboard!', 'success');
      } catch (e) {
        if (typeof showToast === 'function') showToast('Could not copy URL automatically', 'error');
      }
      document.body.removeChild(ta);
    }

    deleteItem(id) {
      if (confirm('Are you sure you want to remove this image from the Media Library?')) {
        this.deleteMediaItem(id);
      }
    }

    openUploadModal() {
      const modal = document.getElementById('upload-media-modal');
      if (modal) modal.style.display = 'flex';
    }

    closeUploadModal() {
      const modal = document.getElementById('upload-media-modal');
      if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('upload-media-form');
        if (form) form.reset();
      }
    }

    handleUploadSubmit(e) {
      e.preventDefault();
      const title = (document.getElementById('upload-media-title') || {}).value || '';
      const urlInput = (document.getElementById('upload-media-url') || {}).value || '';
      const fileInput = document.getElementById('upload-media-file');
      const category = (document.getElementById('upload-media-category') || {}).value || 'custom';

      if (fileInput && fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          const dataUrl = event.target.result;
          this.addMediaItem({
            title: title || file.name.replace(/\.[^/.]+$/, ''),
            url: dataUrl,
            category: category
          });
          this.closeUploadModal();
        };
        reader.readAsDataURL(file);
      } else if (urlInput.trim()) {
        this.addMediaItem({
          title: title || 'Image ' + new Date().toLocaleDateString(),
          url: urlInput.trim(),
          category: category
        });
        this.closeUploadModal();
      } else {
        if (typeof showToast === 'function')
          showToast('Please provide an image URL or choose a file.', 'error');
      }
    }
  }

  window.MediaLibrary = new MediaLibraryManager();

  // Global HTML handlers
  window.openMediaLibraryModal = function (inputId) {
    if (window.MediaLibrary) window.MediaLibrary.openModal(inputId);
  };
  window.closeMediaLibraryModal = function () {
    if (window.MediaLibrary) window.MediaLibrary.closeModal();
  };
  window.openUploadMediaModal = function () {
    if (window.MediaLibrary) window.MediaLibrary.openUploadModal();
  };
  window.closeUploadMediaModal = function () {
    if (window.MediaLibrary) window.MediaLibrary.closeUploadModal();
  };
  window.filterMediaLibrary = function () {
    if (!window.MediaLibrary) return;
    const searchEl = document.getElementById('media-library-search');
    const filterEl = document.getElementById('media-library-filter');
    window.MediaLibrary.searchTerm = searchEl ? searchEl.value : '';
    window.MediaLibrary.selectedFilter = filterEl ? filterEl.value : 'all';
    window.MediaLibrary.renderMediaGrid();
  };
  window.filterModalMediaLibrary = function () {
    if (!window.MediaLibrary) return;
    const searchEl = document.getElementById('media-modal-search');
    const filterEl = document.getElementById('media-modal-filter');
    window.MediaLibrary.searchTerm = searchEl ? searchEl.value : '';
    window.MediaLibrary.selectedFilter = filterEl ? filterEl.value : 'all';
    window.MediaLibrary.renderModalGrid();
  };
})();
