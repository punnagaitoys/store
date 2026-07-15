/**
 * admin-ui.js — UI Controllers for Admin Panel extensions
 * 
 * Binds the DOM elements in admin.html to the underlying pure/glue logic in
 * admin-inventory.js, admin-orders.js, admin-coupons.js, and admin-categories.js.
 */

(function () {
  'use strict';

  // --- Utility ---
  function el(id) { return document.getElementById(id); }
  
  function showToast(msg, type = 'info') {
    if (window.showToast) {
      window.showToast(msg, type);
    } else {
      alert(msg);
    }
  }

  function formatDate(ts) {
    if (!ts) return '—';
    let ms = ts;
    if (typeof ts === 'object') {
      if (typeof ts.toMillis === 'function') ms = ts.toMillis();
      else if (typeof ts.seconds === 'number') ms = ts.seconds * 1000;
    }
    const d = new Date(ms);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ==========================================================================
  // INVENTORY
  // ==========================================================================
  function initInventory() {
    const btnDownload = el('btn-download-template');
    const btnProcess = el('btn-process-inventory');
    
    if (btnDownload) {
      btnDownload.onclick = () => {
        if (window.PunnagaiAdminInventory) {
          window.PunnagaiAdminInventory.downloadTemplate();
        }
      };
    }

    if (btnProcess) {
      btnProcess.onclick = async () => {
        const fileInput = el('inventory-upload-file');
        const file = fileInput && fileInput.files ? fileInput.files[0] : null;
        if (!file) {
          showToast('Please select a CSV file first.', 'error');
          return;
        }

        const resultsDiv = el('inventory-upload-results');
        const text = el('process-inventory-text');
        const spinner = el('process-inventory-spinner');
        
        text.style.display = 'none';
        spinner.style.display = 'block';
        btnProcess.disabled = true;
        resultsDiv.style.display = 'none';

        try {
          const res = await window.PunnagaiAdminInventory.uploadInventoryFile(file);
          resultsDiv.style.display = 'block';
          
          if (res.success) {
            resultsDiv.style.backgroundColor = 'var(--success-bg)';
            resultsDiv.style.border = '1px solid var(--success)';
            resultsDiv.style.color = 'var(--success)';
            resultsDiv.innerHTML = `<strong>Success!</strong> Uploaded ${res.skuCount} SKUs. Updated ${res.updatedCount} products.`;
            fileInput.value = ''; // clear
          } else {
            resultsDiv.style.backgroundColor = 'var(--error-bg)';
            resultsDiv.style.border = '1px solid var(--error)';
            resultsDiv.style.color = 'var(--error)';
            let html = `<strong>Upload Failed</strong><br>${escapeHtml(res.error || 'Unknown error')}`;
            if (res.failedRows && res.failedRows.length > 0) {
              html += `<ul style="margin-top:10px; padding-left:20px;">`;
              res.failedRows.forEach(r => {
                html += `<li>Row ${r.row}: SKU ${escapeHtml(r.sku)} - ${escapeHtml(r.reason)}</li>`;
              });
              html += `</ul>`;
            }
            resultsDiv.innerHTML = html;
          }
        } catch (err) {
          showToast('Upload failed: ' + err.message, 'error');
        } finally {
          text.style.display = 'block';
          spinner.style.display = 'none';
          btnProcess.disabled = false;
        }
      };
    }
  }

  // ==========================================================================
  // ORDERS
  // ==========================================================================
  let allOrders = [];

  async function loadOrders() {
    const tbody = el('admin-orders-table-body');
    const countEl = el('orders-section-count');
    if (!tbody || !window.PunnagaiAdminOrders) return;

    tbody.innerHTML = '<tr><td colspan="6" class="table-loading-cell"><div class="loading-spinner" style="margin:auto"></div></td></tr>';
    
    try {
      const res = await window.PunnagaiAdminOrders.loadOrders();
      if (res && res.success) {
        allOrders = res.orders || [];
        if (countEl) countEl.textContent = `${allOrders.length} total orders`;
        renderOrdersTable(allOrders);
      } else {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed to load orders: ${escapeHtml(res?.error || '')}</td></tr>`;
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed to load orders</td></tr>`;
    }
  }

  function renderOrdersTable(orders) {
    const tbody = el('admin-orders-table-body');
    if (!tbody) return;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No orders found.</td></tr>';
      return;
    }

    let html = '';
    orders.forEach(o => {
      const customer = window.PunnagaiAdminOrders.orderCustomerName(o);
      const total = Number(o.total || 0).toLocaleString('en-IN');
      const status = (o.status || 'pending').toLowerCase();
      const statusClass = `badge-${status.replace(' ', '-')}`;
      
      let actions = `<button class="btn btn-outline btn-sm" onclick="window.AdminUI.openOrderModal('${o.id}')">View</button>`;
      
      const checkboxStr = (status === 'pending' || status === 'confirmed')
        ? `<input type="checkbox" class="order-checkbox" value="${escapeHtml(o.id)}" onchange="if(window.AdminUI) window.AdminUI.updateBulkShipButton()">`
        : '';

      html += `<tr>
        <td>${checkboxStr}</td>
        <td>#${escapeHtml(o.id.substring(0,8))}</td>
        <td>${formatDate(o.createdAt)}</td>
        <td>${escapeHtml(customer)}</td>
        <td>₹${total}</td>
        <td><span class="badge ${statusClass}">${escapeHtml(o.status || 'Pending')}</span></td>
        <td>${actions}</td>
      </tr>`;
    });
    
    tbody.innerHTML = html;
    updateBulkShipButton();
  }

  function toggleSelectAllOrders(event) {
    const isChecked = event.target.checked;
    const checkboxes = document.querySelectorAll('.order-checkbox');
    checkboxes.forEach(cb => cb.checked = isChecked);
    updateBulkShipButton();
  }

  function updateBulkShipButton() {
    const btn = el('btn-bulk-ship');
    if (!btn) return;
    const checked = document.querySelectorAll('.order-checkbox:checked').length;
    btn.disabled = checked === 0;
    btn.textContent = checked > 0 ? `Mark ${checked} Selected as Shipped` : 'Mark Selected as Shipped';
  }

  async function bulkMarkShipped() {
    const checked = Array.from(document.querySelectorAll('.order-checkbox:checked')).map(cb => cb.value);
    if (checked.length === 0) return;
    if (!confirm(`Mark ${checked.length} orders as shipped?`)) return;

    let successCount = 0;
    for (const id of checked) {
      try {
        const res = await window.PunnagaiAdminOrders.markOrderShipped(id, 'TRACK-BULK-' + Date.now(), 'user@example.com');
        if (res.success) successCount++;
      } catch (err) {
        console.error("Failed to bulk ship order", id, err);
      }
    }
    showToast(`Successfully marked ${successCount}/${checked.length} orders as shipped`, 'success');
    loadOrders();
    const selectAll = el('selectAllOrders');
    if (selectAll) selectAll.checked = false;
  }

  function handleOrderSearchFilter() {
    if (!window.PunnagaiAdminOrders) return;
    const term = (el('admin-orders-search')?.value || '').trim();
    const status = el('admin-orders-status-filter')?.value || '';
    
    let filtered = allOrders;
    if (status) {
      filtered = window.PunnagaiAdminOrders.filterOrdersByStatus(filtered, status);
    }
    if (term) {
      filtered = window.PunnagaiAdminOrders.searchOrders(filtered, term);
    }
    renderOrdersTable(filtered);
  }

  function initOrders() {
    const search = el('admin-orders-search');
    const filter = el('admin-orders-status-filter');
    if (search) search.addEventListener('input', handleOrderSearchFilter);
    if (filter) filter.addEventListener('change', handleOrderSearchFilter);
  }

  async function actionMarkShipped(orderId) {
    if (!confirm('Mark this order as shipped and send tracking link?')) return;
    try {
      const res = await window.PunnagaiAdminOrders.markOrderShipped(orderId, 'TRACK-' + Date.now(), 'user@example.com');
      if (res.success) {
        showToast('Order marked as shipped!', 'success');
        closeOrderModal();
        loadOrders();
      } else {
        showToast('Failed: ' + res.error, 'error');
      }
    } catch (err) {
      showToast('Error marking shipped', 'error');
    }
  }

  async function actionRefund(orderId) {
    if (!confirm('Process refund? This will attempt a UPI refund and restore inventory.')) return;
    try {
      const order = allOrders.find(o => o.id === orderId);
      const res = await window.PunnagaiAdminOrders.processRefund(order);
      if (res.success) {
        showToast('Refund processed successfully!', 'success');
        closeOrderModal();
        loadOrders();
      } else {
        showToast('Refund Failed: ' + res.error, 'error');
      }
    } catch (err) {
      showToast('Error processing refund', 'error');
    }
  }

  function openOrderModal(orderId) {
    const order = allOrders.find(o => o.id === orderId);
    if (!order) return;
    
    const content = el('order-modal-content');
    const modal = el('order-modal');
    if (!content || !modal) return;

    let itemsHtml = '<ul style="list-style:none; padding:0; margin:10px 0;">';
    (order.items || []).forEach(it => {
      itemsHtml += `<li style="padding:8px 0; border-bottom:1px solid var(--border)">
        <strong>${escapeHtml(it.name || 'Product')}</strong> x${it.quantity}
        <br><small class="text-secondary">SKU: ${escapeHtml(it.skuId || 'N/A')}</small>
      </li>`;
    });
    itemsHtml += '</ul>';

    let actionButtons = '';
    const status = (order.status || '').toLowerCase();
    
    if (status === 'confirmed' || status === 'pending') {
      actionButtons += `<button class="btn btn-primary" onclick="window.AdminUI.actionMarkShipped('${order.id}')">Mark Shipped</button>`;
      actionButtons += `<button class="btn btn-outline" style="margin-left:10px" onclick="window.AdminUI.actionRefund('${order.id}')">Refund Order</button>`;
    } else if (status === 'cancelled') {
       actionButtons += `<button class="btn btn-outline" onclick="window.AdminUI.actionRefund('${order.id}')">Process Refund</button>`;
    }

    content.innerHTML = `
      <div style="margin-bottom:16px">
        <strong>Order ID:</strong> ${escapeHtml(order.id)}<br>
        <strong>Status:</strong> <span class="badge badge-${status.replace(' ', '-')}">${escapeHtml(order.status)}</span><br>
        <strong>Total:</strong> ₹${Number(order.total || 0).toLocaleString('en-IN')}<br>
        <strong>Date:</strong> ${formatDate(order.createdAt)}
      </div>
      <div style="margin-bottom:16px">
        <strong>Shipping Address:</strong><br>
        ${escapeHtml(order.shipping?.fullName || 'N/A')}<br>
        ${escapeHtml(order.shipping?.address || '')}<br>
        ${escapeHtml(order.shipping?.city || '')}, ${escapeHtml(order.shipping?.pinCode || '')}
      </div>
      <div>
        <strong>Items:</strong>
        ${itemsHtml}
      </div>
      <div style="margin-top:20px;">
        ${actionButtons}
      </div>
    `;

    modal.style.display = 'flex';
  }

  function closeOrderModal() {
    const modal = el('order-modal');
    if (modal) modal.style.display = 'none';
  }

  // ==========================================================================
  // COUPONS
  // ==========================================================================
  async function loadCoupons() {
    const tbody = el('admin-coupons-table-body');
    if (!tbody || !window.PunnagaiAdminCoupons) return;
    
    tbody.innerHTML = '<tr><td colspan="6" class="table-loading-cell"><div class="loading-spinner" style="margin:auto"></div></td></tr>';
    
    try {
      const res = await window.PunnagaiAdminCoupons.listActiveCoupons();
      if (res && res.success) {
        renderCouponsTable(res.coupons || []);
      } else {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed to load coupons</td></tr>`;
      }
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-error">Failed to load coupons</td></tr>`;
    }
  }

  function renderCouponsTable(coupons) {
    const tbody = el('admin-coupons-table-body');
    if (!tbody) return;

    if (!coupons || coupons.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No active coupons found.</td></tr>';
      return;
    }

    let html = '';
    coupons.forEach(c => {
      const discount = c.discountType === 'percentage' ? `${c.discountValue}%` : `₹${c.discountValue}`;
      const usage = `${c.usageCount || 0} / ${c.usageLimit || '∞'}`;
      const expiry = c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Never';
      
      html += `<tr>
        <td><strong>${escapeHtml(c.code)}</strong></td>
        <td>${discount}</td>
        <td>${usage}</td>
        <td>${expiry}</td>
        <td><span class="badge ${c.active ? 'badge-success' : 'badge-error'}">${c.active ? 'Active' : 'Inactive'}</span></td>
        <td>
          ${c.active ? `<button class="btn btn-outline btn-sm" onclick="window.AdminUI.deactivateCoupon('${c.id}')">Deactivate</button>` : ''}
        </td>
      </tr>`;
    });
    
    tbody.innerHTML = html;
  }

  async function deactivateCoupon(couponId) {
    if (!confirm('Are you sure you want to deactivate this coupon?')) return;
    try {
      const res = await window.PunnagaiAdminCoupons.deactivateCoupon(couponId);
      if (res.success) {
        showToast('Coupon deactivated', 'success');
        loadCoupons();
      } else {
        showToast('Failed to deactivate: ' + res.error, 'error');
      }
    } catch (err) {
      showToast('Error deactivating coupon', 'error');
    }
  }

  function openCouponModal() {
    const modal = el('coupon-modal');
    if (modal) modal.style.display = 'flex';
  }
  function closeCouponModal() {
    const modal = el('coupon-modal');
    if (modal) modal.style.display = 'none';
  }

  function initCoupons() {
    const form = el('coupon-form');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const type = el('coupon-type').value;
        const val = Number(el('coupon-value').value);
        const limit = Number(el('coupon-limit').value);
        const exp = el('coupon-expiry').value;
        
        const btn = el('btn-submit-coupon');
        btn.disabled = true;

        try {
          const res = await window.PunnagaiAdminCoupons.createCouponCode(
            type, val,
            exp ? new Date(exp).getTime() : null,
            limit
          );
          
          if (res.success) {
            showToast(`Coupon created: ${res.code}`, 'success');
            closeCouponModal();
            form.reset();
            loadCoupons();
          } else {
            showToast('Failed to create coupon: ' + res.error, 'error');
          }
        } catch (err) {
          showToast('Error creating coupon', 'error');
        } finally {
          btn.disabled = false;
        }
      };
    }
  }

  // ==========================================================================
  // CATEGORIES & BANNERS
  // ==========================================================================
  async function loadCategories() {
    const tbody = el('admin-categories-table-body');
    if (!tbody || !window.AdminCategories) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="table-loading-cell"><div class="loading-spinner" style="margin:auto"></div></td></tr>';
    
    try {
      const res = await window.AdminCategories.listCategoriesWithCounts();
      if (!res || res.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No categories found.</td></tr>';
        return;
      }
      
      let html = '';
      res.forEach(c => {
        html += `<tr>
          <td>${escapeHtml(c.name)}</td>
          <td>${c.productCount || 0}</td>
          <td></td>
        </tr>`;
      });
      tbody.innerHTML = html;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-error">Failed to load categories</td></tr>`;
    }
  }

  async function loadBanners() {
    const tbody = el('admin-banners-table-body');
    if (!tbody || !window.AdminCategories) return;
    
    tbody.innerHTML = '<tr><td colspan="3" class="table-loading-cell"><div class="loading-spinner" style="margin:auto"></div></td></tr>';
    
    try {
      let banners = [];
      if (typeof window.getBanners === 'function') {
         banners = await window.getBanners({}); // data.js function
      } else {
         banners = await window.AdminCategories.listActiveBanners();
      }

      if (!banners || banners.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No banners found.</td></tr>';
        return;
      }
      
      let html = '';
      banners.forEach(b => {
        html += `<tr>
          <td><img src="${escapeHtml(b.imageUrl)}" style="height:40px; border-radius:4px" alt="Banner"></td>
          <td><span class="badge ${b.active ? 'badge-success' : 'badge-error'}">${b.active ? 'Yes' : 'No'}</span></td>
          <td>
            <button class="btn btn-outline btn-sm" onclick="window.AdminUI.toggleBanner('${b.id}', ${!b.active})">
              ${b.active ? 'Deactivate' : 'Activate'}
            </button>
          </td>
        </tr>`;
      });
      tbody.innerHTML = html;
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-error">Failed to load banners</td></tr>`;
    }
  }

  async function toggleBanner(id, desiredState) {
    try {
      const res = await window.AdminCategories.toggleBanner(id, desiredState);
      if (res.success) {
        loadBanners();
      } else {
        showToast('Failed to toggle banner: ' + res.error, 'error');
      }
    } catch (err) {
      showToast('Error toggling banner', 'error');
    }
  }

  function initCategories() {
    const catForm = el('admin-category-form');
    if (catForm) {
      catForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = el('new-category-name').value;
        const btn = el('btn-add-category');
        btn.disabled = true;
        try {
          const res = await window.AdminCategories.createCategory(name, '', null);
          if (res.success) {
            showToast('Category created!', 'success');
            catForm.reset();
            loadCategories();
          } else {
            showToast('Failed to create category: ' + res.error, 'error');
          }
        } catch(err) {
          showToast('Error creating category', 'error');
        } finally {
          btn.disabled = false;
        }
      };
    }

    const banForm = el('admin-banner-form');
    if (banForm) {
      banForm.onsubmit = async (e) => {
        e.preventDefault();
        const url = el('new-banner-url').value;
        const link = el('new-banner-link').value;
        const btn = el('btn-add-banner');
        btn.disabled = true;
        try {
          const res = await window.AdminCategories.createBanner(url, link);
          if (res.success) {
            showToast('Banner created!', 'success');
            banForm.reset();
            loadBanners();
          } else {
            showToast('Failed to create banner: ' + res.error, 'error');
          }
        } catch(err) {
          showToast('Error creating banner', 'error');
        } finally {
          btn.disabled = false;
        }
      };
    }
  }


  // ==========================================================================
  // DASHBOARD & AUDIT LOGS
  // ==========================================================================
  
  let chartInstance = null;

  async function loadDashboardCharts() {
    if (!window.PunnagaiAdminOrders || typeof Chart === 'undefined') return;
    try {
      const res = await window.PunnagaiAdminOrders.loadOrders();
      if (res && res.success) {
        const orders = res.orders || [];
        const statusCounts = { pending: 0, confirmed: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0 };
        orders.forEach(o => {
          const s = (o.status || 'pending').toLowerCase();
          if (statusCounts[s] !== undefined) statusCounts[s]++;
        });

        const ctx = el('ordersChart');
        if (!ctx) return;
        
        if (chartInstance) {
          chartInstance.destroy();
        }

        chartInstance = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled', 'Refunded'],
            datasets: [{
              data: [
                statusCounts.pending, statusCounts.confirmed, statusCounts.shipped,
                statusCounts.delivered, statusCounts.cancelled, statusCounts.refunded
              ],
              backgroundColor: ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444', '#6b7280']
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } } }
          }
        });
      }
    } catch(err) {
      console.error('Failed to load charts', err);
    }
  }

  function loadLowStock(adminProducts) {
    const tbody = el('low-stock-table-body');
    if (!tbody || !adminProducts) return;
    
    const lowStock = adminProducts.filter(p => p.quantity < 5).sort((a,b) => a.quantity - b.quantity);
    
    if (lowStock.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" class="text-center">Inventory levels are healthy!</td></tr>';
      return;
    }

    let html = '';
    lowStock.forEach(p => {
      const isOut = p.quantity <= 0;
      html += `<tr>
        <td>${escapeHtml(p.skuId || p.id.substring(0,8))}</td>
        <td>${escapeHtml(p.name)}</td>
        <td style="color:${isOut ? 'var(--error)' : 'var(--warning)'}; font-weight:bold">${p.quantity}</td>
      </tr>`;
    });
    tbody.innerHTML = html;
  }

  async function loadAuditLogs() {
    const tbody = el('admin-audit-table-body');
    if (!tbody || !window.getAuditLogs) return;
    
    tbody.innerHTML = '<tr><td colspan="5" class="table-loading-cell"><div class="loading-spinner" style="margin:auto"></div></td></tr>';
    try {
      const logs = await window.getAuditLogs();
      if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No logs found.</td></tr>';
        return;
      }
      
      let html = '';
      logs.forEach(log => {
        let details = '';
        if (log.payload) {
          try { details = JSON.stringify(log.payload); } 
          catch(e) { details = String(log.payload); }
        }
        
        const typeStr = log.entity && log.entity.type ? log.entity.type : 'N/A';
        const idStr = log.entity && log.entity.id ? log.entity.id : 'N/A';
        
        html += `<tr>
          <td>${formatDate(log.timestamp)}</td>
          <td>${escapeHtml(log.adminEmail || log.adminUid || 'Unknown')}</td>
          <td><span class="badge badge-pending">${escapeHtml(log.operationType)}</span></td>
          <td>${escapeHtml(typeStr)} (${escapeHtml(String(idStr).substring(0,8))})</td>
          <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(details)}">
            ${escapeHtml(details)}
          </td>
        </tr>`;
      });
      tbody.innerHTML = html;
    } catch (err) {
      console.error(err);
      tbody.innerHTML = '<tr><td colspan="5" class="text-error text-center">Failed to load audit logs.</td></tr>';
    }
  }


  // ==========================================================================
  // EXPORTS
  // ==========================================================================
  
  // Expose methods for the global namespace so they can be called from admin.js
  // and inline onclick handlers.
  window.AdminUI = {
    // Initialization setup (called once on DOM loaded)
    initInventory,
    initOrders,
    initCoupons,
    initCategories,
    
    // Lazy Loaders (called when switching tabs)
    loadOrders,
    loadCoupons,
    loadCategories,
    loadBanners,
    loadDashboardCharts,
    loadLowStock,
    loadAuditLogs,

    toggleSelectAllOrders,
    updateBulkShipButton,
    bulkMarkShipped,

    // Modal controllers
    openOrderModal,
    closeOrderModal,
    openCouponModal,
    closeCouponModal,

    // Actions
    actionMarkShipped,
    actionRefund,
    deactivateCoupon,
    toggleBanner
  };

  // Attach initialization
  document.addEventListener('DOMContentLoaded', () => {
    initInventory();
    initOrders();
    initCoupons();
    initCategories();
  });

})();
