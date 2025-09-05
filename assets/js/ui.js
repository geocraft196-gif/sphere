/**
 * UI Helper Functions
 * Handles toasts, loaders, and other UI components
 */

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duration in milliseconds (default: 4000)
 */
export function showToast(message, type = 'info', duration = 4000) {
  // Create toast container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
    </div>
  `;
  
  // Add to container
  container.appendChild(toast);
  
  // Trigger animation
  setTimeout(() => toast.classList.add('show'), 100);
  
  // Auto remove
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, duration);
}

/**
 * Show loading overlay
 * @param {string} message - Loading message
 */
export function showLoader(message = 'Loading...') {
  // Remove existing loader
  hideLoader();
  
  const loader = document.createElement('div');
  loader.id = 'global-loader';
  loader.className = 'loader-overlay';
  loader.innerHTML = `
    <div class="loader-content">
      <div class="spinner"></div>
      <p class="loader-message">${message}</p>
    </div>
  `;
  
  document.body.appendChild(loader);
  
  // Trigger animation
  setTimeout(() => loader.classList.add('show'), 10);
}

/**
 * Hide loading overlay
 */
export function hideLoader() {
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.classList.remove('show');
    setTimeout(() => {
      if (loader.parentNode) {
        loader.parentNode.removeChild(loader);
      }
    }, 300);
  }
}

/**
 * Show confirmation dialog
 * @param {string} message - Confirmation message
 * @param {string} confirmText - Confirm button text
 * @param {string} cancelText - Cancel button text
 * @returns {Promise<boolean>} - User's choice
 */
export function showConfirmDialog(message, confirmText = 'Confirm', cancelText = 'Cancel') {
  return new Promise((resolve) => {
    const modal = document.createElement('div');
    modal.className = 'modal confirm-modal show';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Confirm Action</h3>
        </div>
        <div class="modal-body">
          <p>${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary cancel-btn">${cancelText}</button>
          <button class="btn btn-primary confirm-btn">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Handle clicks
    modal.querySelector('.cancel-btn').addEventListener('click', () => {
      modal.remove();
      resolve(false);
    });
    
    modal.querySelector('.confirm-btn').addEventListener('click', () => {
      modal.remove();
      resolve(true);
    });
    
    // Handle backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
        resolve(false);
      }
    });
    
    // Handle escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
        resolve(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
  });
}

/**
 * Format time duration
 * @param {number} seconds - Duration in seconds
 * @returns {string} - Formatted time string
 */
export function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

/**
 * Format date for display
 * @param {Date} date - Date to format
 * @returns {string} - Formatted date string
 */
export function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Format relative time (e.g., "2 hours ago")
 * @param {Date} date - Date to format
 * @returns {string} - Relative time string
 */
export function formatRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return formatDate(date);
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} - Debounced function
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} - Throttled function
 */
export function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Show empty state message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Empty state message
 * @param {string} icon - Icon to display
 * @param {string} actionText - Action button text (optional)
 * @param {Function} actionCallback - Action button callback (optional)
 */
export function showEmptyState(container, message, icon = '📄', actionText = null, actionCallback = null) {
  const emptyState = document.createElement('div');
  emptyState.className = 'empty-state';
  emptyState.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <h3>No Data Found</h3>
    <p>${message}</p>
    ${actionText ? `<button class="btn btn-primary empty-action">${actionText}</button>` : ''}
  `;
  
  if (actionText && actionCallback) {
    emptyState.querySelector('.empty-action').addEventListener('click', actionCallback);
  }
  
  container.innerHTML = '';
  container.appendChild(emptyState);
}

/**
 * Create pagination controls
 * @param {number} currentPage - Current page number (1-based)
 * @param {number} totalPages - Total number of pages
 * @param {Function} onPageChange - Page change callback
 * @returns {HTMLElement} - Pagination element
 */
export function createPagination(currentPage, totalPages, onPageChange) {
  const pagination = document.createElement('div');
  pagination.className = 'pagination';
  
  // Previous button
  const prevBtn = document.createElement('button');
  prevBtn.className = `btn btn-outline btn-sm ${currentPage === 1 ? 'disabled' : ''}`;
  prevBtn.textContent = 'Previous';
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener('click', () => {
    if (currentPage > 1) onPageChange(currentPage - 1);
  });
  pagination.appendChild(prevBtn);
  
  // Page numbers
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-outline'}`;
    pageBtn.textContent = i;
    pageBtn.addEventListener('click', () => onPageChange(i));
    pagination.appendChild(pageBtn);
  }
  
  // Next button
  const nextBtn = document.createElement('button');
  nextBtn.className = `btn btn-outline btn-sm ${currentPage === totalPages ? 'disabled' : ''}`;
  nextBtn.textContent = 'Next';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) onPageChange(currentPage + 1);
  });
  pagination.appendChild(nextBtn);
  
  return pagination;
}