/**
 * Punnagai Toy Store — WordPress-Style Media Library
 * Enables admins to manage, search, upload, and easily attach images to products & banners.
 */
(function () {
  const CUSTOM_MEDIA_KEY = 'punnagai_media_library_custom';

  const DEFAULT_MEDIA_ITEMS = [
  {
    "id": "med_banner_1",
    "title": "Primary Storefront Hero Banner",
    "category": "banners",
    "url": "images/hero-banner.png",
    "date": "2026-07-01",
    "dimensions": "1870x841"
  },
  {
    "id": "med_banner_2",
    "title": "Storefront Summer Sale Banner",
    "category": "banners",
    "url": "images/banners/banner-summer-sale.jpg",
    "date": "2026-07-02",
    "dimensions": "1497x643"
  },
  {
    "id": "med_banner_3",
    "title": "Secondary Action & RC Hero Banner",
    "category": "banners",
    "url": "images/banners/hero-banner-2.png",
    "date": "2026-07-03",
    "dimensions": "1672x941"
  },
  {
    "id": "med_banner_4",
    "title": "Storefront Promotional Showcase Banner",
    "category": "banners",
    "url": "images/banners/storefront-promo-banner.png",
    "date": "2026-07-04",
    "dimensions": "1535x1024"
  },
  {
    "id": "med_banner_5",
    "title": "Mylapore Store Interior Photography",
    "category": "banners",
    "url": "images/store-interior.png",
    "date": "2026-07-05",
    "dimensions": "1536x1024"
  },
  {
    "id": "med_banner_6",
    "title": "Social Share & OpenGraph Card",
    "category": "banners",
    "url": "images/social-share.jpg",
    "date": "2026-07-06",
    "dimensions": "1200x630"
  },
  {
    "id": "med_logo",
    "title": "Official Punnagai Toys Brand Logo",
    "category": "branding",
    "url": "logo.png",
    "date": "2026-07-07",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_1",
    "title": "3D Wooden Ludo Family Board Game",
    "category": "toys",
    "url": "images/products/wooden-3d-ludo-family-board-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_2",
    "title": "Automatic Bubble Gun Gatling Blaster",
    "category": "toys",
    "url": "images/products/automatic-bubble-gun-blaster-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_3",
    "title": "Catan: Trade, Build, Settle Board Game",
    "category": "toys",
    "url": "images/products/catan-trade-build-settle-board-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_4",
    "title": "Crossword Word Building Board Game",
    "category": "toys",
    "url": "images/products/crossword-educational-word-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_5",
    "title": "Cute Reversible Strawberry Bunny Plush",
    "category": "toys",
    "url": "images/products/cute-strawberry-bunny-soft-plush-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_6",
    "title": "Musical Dancing Angel Princess Doll",
    "category": "toys",
    "url": "images/products/dancing-angel-doll-lights-music-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_7",
    "title": "Dancing Bunny Musical Toy with LED Lights",
    "category": "toys",
    "url": "images/products/dancing-bunny-musical-light-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_8",
    "title": "Dancing Elephant with Floating Air Ball",
    "category": "toys",
    "url": "images/products/dancing-elephant-musical-toy-adventure-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_9",
    "title": "Electric Swan with 3D Lights & Motion",
    "category": "toys",
    "url": "images/products/electric-swan-lights-music-motion-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_10",
    "title": "Heavy Duty JCB Excavator Construction Truck",
    "category": "toys",
    "url": "images/products/construction-jcb-excavator-truck-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_11",
    "title": "Formula 1 High-Speed Racing Car",
    "category": "toys",
    "url": "images/products/formula-one-racing-car-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_12",
    "title": "Hanging Windmill Sensory Activity Toy",
    "category": "toys",
    "url": "images/products/hanging-windmill-infant-crib-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_13",
    "title": "Air Power Hover Soccer Ball with LED",
    "category": "toys",
    "url": "images/products/hover-soccer-ball-indoor-sports-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_14",
    "title": "Sweet Treats Ice Cream Vandi Pretend Cart",
    "category": "toys",
    "url": "images/products/ice-cream-cart-vandi-pretend-play-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_15",
    "title": "Electric Crawling Musical Caterpillar Worm",
    "category": "toys",
    "url": "images/products/electric-crawling-worm-musical-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_16",
    "title": "Little Doctor Medical Suitcase Play Set",
    "category": "toys",
    "url": "images/products/little-doctor-medical-kit-pretend-play-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_17",
    "title": "Monopoly India Edition Board Game",
    "category": "toys",
    "url": "images/products/monopoly-india-edition-board-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_18",
    "title": "Neon RC 360° Rotating Stunt Car",
    "category": "toys",
    "url": "images/products/neon-rc-stunt-car-adventure-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_19",
    "title": "Pictureka! Fast-Paced Picture Hunt Game",
    "category": "toys",
    "url": "images/products/pictureka-fast-paced-picture-hunt-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_20",
    "title": "Premium Handcrafted Wooden Chess Set",
    "category": "toys",
    "url": "images/products/premium-wooden-chess-set-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_21",
    "title": "Rainbow Soft Teddy Bear (40 cm)",
    "category": "toys",
    "url": "images/products/rainbow-teddy-bear-soft-plush-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_22",
    "title": "Remote Control Supersonic Fighter Jet",
    "category": "toys",
    "url": "images/products/rc-fighter-jet-airplane-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_23",
    "title": "RC Flying Helicopter with Altitude Hold",
    "category": "toys",
    "url": "images/products/rc-helicopter-smooth-flight-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_24",
    "title": "Speed Demon RC Sports Racing Car",
    "category": "toys",
    "url": "images/products/rc-sports-racing-car-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_25",
    "title": "Interactive Smart Dancing Robot with Lights",
    "category": "toys",
    "url": "images/products/smart-robot-lights-sounds-fun-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_26",
    "title": "Classic Cuddle Soft Teddy Bear",
    "category": "toys",
    "url": "images/products/soft-classic-teddy-bear-plush-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_27",
    "title": "Space Gun G-Strike Cosmic Dart Blaster",
    "category": "toys",
    "url": "images/products/space-gun-g-strike-toy-blaster-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_28",
    "title": "Splendor Strategy Gem Trading Game",
    "category": "toys",
    "url": "images/products/splendor-strategy-board-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_29",
    "title": "Thomas & Friends Track Master Train Set",
    "category": "toys",
    "url": "images/products/thomas-train-track-set-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_30",
    "title": "Thunder Foam Soft Dart Blaster",
    "category": "toys",
    "url": "images/products/thunder-foam-dart-blaster-gun-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_31",
    "title": "Thunder Strike Rapid Fire Blaster",
    "category": "toys",
    "url": "images/products/thunder-strike-toy-blaster-gun-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_32",
    "title": "1-Click Transforming RC Robot Car",
    "category": "toys",
    "url": "images/products/transforming-robot-car-action-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_33",
    "title": "Ultimate All-Terrain RC Stunt Crawler",
    "category": "toys",
    "url": "images/products/ultimate-rc-stunt-car-adventure-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_34",
    "title": "Magical Glowing Horn Unicorn Plush",
    "category": "toys",
    "url": "images/products/unicorn-soft-plush-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_35",
    "title": "Long Range Kids Two-Way Walkie Talkie Set",
    "category": "toys",
    "url": "images/products/walkie-talkie-kids-adventure-set-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_36",
    "title": "Natural Pine Wooden Tumbling Tower (Jenga)",
    "category": "toys",
    "url": "images/products/wooden-jenga-tumbling-tower-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_37",
    "title": "Classic Wooden Ludo & Snakes Board Game",
    "category": "toys",
    "url": "images/products/wooden-ludo-classic-family-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_38",
    "title": "Montessori Wooden Memory Match Chess Game",
    "category": "toys",
    "url": "images/products/wooden-memory-chess-educational-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_39",
    "title": "Wooden Numbers & Shapes Counting Puzzle",
    "category": "toys",
    "url": "images/products/wooden-number-puzzle-math-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_40",
    "title": "Montessori Wooden Geometric Shape Sorter",
    "category": "toys",
    "url": "images/products/wooden-shape-sorter-educational-toy-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
  },
  {
    "id": "med_toy_41",
    "title": "Handcrafted Wooden Tic Tac Toe Noughts & Crosses",
    "category": "toys",
    "url": "images/products/wooden-tic-tac-toe-puzzle-game-punnagai.jpg",
    "date": "2026-07-10",
    "dimensions": "1254x1254"
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

    async init(catalogProducts = []) {
      let customItems = [];
      if (!window.USE_LOCAL_MODE && window.db && typeof window.db.collection === 'function') {
        try {
          const snap = await window.db.collection('media').orderBy('createdAt', 'desc').get();
          customItems = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (e) {
          console.warn('[media-library] Firestore fetch failed, checking local:', e);
          customItems = this.getCustomItems();
        }
      } else {
        customItems = this.getCustomItems();
      }

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
      this.renderMediaGrid();
      this.renderModalGrid();
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
        id: 'med_cust_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        title: title || 'Custom Image ' + new Date().toLocaleDateString(),
        category: category,
        url: url,
        date: new Date().toISOString().split('T')[0],
        dimensions: dimensions,
        createdAt: Date.now(),
        isCustom: true
      };

      if (
        typeof window !== 'undefined' &&
        !window.USE_LOCAL_MODE &&
        window.db &&
        typeof window.db.collection === 'function'
      ) {
        window.db
          .collection('media')
          .doc(newItem.id)
          .set(newItem)
          .catch((err) => {
            console.warn('[media-library] Firestore add failed, saved locally:', err);
          });
      }

      // Also preserve in local storage for offline resilience
      const customItems = this.getCustomItems().filter((i) => i.id !== newItem.id);
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

        if (
          typeof window !== 'undefined' &&
          !window.USE_LOCAL_MODE &&
          window.db &&
          typeof window.db.collection === 'function'
        ) {
          window.db
            .collection('media')
            .doc(id)
            .delete()
            .then(() => {
              if (
                item.url &&
                item.url.includes('firebasestorage.googleapis.com') &&
                window.storage &&
                typeof window.storage.refFromURL === 'function'
              ) {
                window.storage
                  .refFromURL(item.url)
                  .delete()
                  .catch(() => {});
              }
            })
            .catch((err) => {
              console.warn('[media-library] Firestore delete error:', err);
            });
        }

        const customItems = this.getCustomItems().filter((i) => i.id !== id);
        this.saveCustomItems(customItems);
        this.renderMediaGrid();
        this.renderModalGrid();
        if (typeof showToast === 'function') showToast('Media item removed.', 'info');
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

    async handleUploadSubmit(e) {
      e.preventDefault();
      const title = (document.getElementById('upload-media-title') || {}).value || '';
      const urlInput = (document.getElementById('upload-media-url') || {}).value || '';
      const fileInput = document.getElementById('upload-media-file');
      const category = (document.getElementById('upload-media-category') || {}).value || 'custom';
      const submitBtn = e.target.querySelector('button[type="submit"]');

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading...';
      }

      try {
        if (fileInput && fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

          // If Firebase Storage is available, upload directly
          if (
            !window.USE_LOCAL_MODE &&
            window.storage &&
            typeof window.storage.ref === 'function'
          ) {
            const storagePath = `media/${Date.now()}_${cleanName}`;
            const fileRef = window.storage.ref().child(storagePath);
            await fileRef.put(file);
            const downloadUrl = await fileRef.getDownloadURL();

            await this.addMediaItem({
              title: title || file.name.replace(/\.[^/.]+$/, ''),
              url: downloadUrl,
              category: category
            });
            this.closeUploadModal();
          } else {
            // Local fallback
            const reader = new FileReader();
            reader.onload = async (event) => {
              const dataUrl = event.target.result;
              await this.addMediaItem({
                title: title || file.name.replace(/\.[^/.]+$/, ''),
                url: dataUrl,
                category: category
              });
              this.closeUploadModal();
            };
            reader.readAsDataURL(file);
          }
        } else if (urlInput.trim()) {
          await this.addMediaItem({
            title: title || 'Image ' + new Date().toLocaleDateString(),
            url: urlInput.trim(),
            category: category
          });
          this.closeUploadModal();
        } else {
          if (typeof showToast === 'function')
            showToast('Please provide an image URL or choose a file.', 'error');
        }
      } catch (uploadErr) {
        console.error('[media-library] Upload error:', uploadErr);
        if (typeof showToast === 'function')
          showToast('Upload failed: ' + (uploadErr.message || uploadErr), 'error');
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Upload / Add Image';
        }
      }
    }
  }

  if (typeof window !== 'undefined') {
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
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      MediaLibraryManager,
      DEFAULT_MEDIA_ITEMS,
      CUSTOM_MEDIA_KEY
    };
  }
})();
