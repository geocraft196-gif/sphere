/**
 * Role Management System
 * Handles role-based UI updates and permissions
 */

import { authManager } from './auth.js';

/**
 * Check if current user has admin role
 * @returns {boolean}
 */
export function isAdmin() {
  return authManager.isAdmin();
}

/**
 * Check if current user is authenticated
 * @returns {boolean}
 */
export function isAuthenticated() {
  return authManager.isAuthenticated();
}

/**
 * Get current user's role
 * @returns {string|null}
 */
export function getUserRole() {
  return authManager.userRole;
}

/**
 * Hide elements that should only be visible to admins
 */
export function hideAdminElements() {
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(element => {
    element.remove(); // Remove from DOM for security
  });
}

/**
 * Show elements that should only be visible to admins
 */
export function showAdminElements() {
  const adminElements = document.querySelectorAll('.admin-only');
  adminElements.forEach(element => {
    element.style.display = '';
  });
}

/**
 * Update UI based on user role
 */
export function updateRoleBasedUI() {
  if (isAdmin()) {
    showAdminElements();
  } else {
    hideAdminElements();
  }
}

/**
 * Require admin role for current page
 * Redirects to dashboard if not admin
 */
export function requireAdmin() {
  if (!isAuthenticated()) {
    authManager.showAuthModal();
    return false;
  }
  
  if (!isAdmin()) {
    window.location.href = 'dashboard.html';
    return false;
  }
  
  return true;
}

/**
 * Require authentication for current page
 * Shows auth modal if not authenticated
 */
export function requireAuth() {
  if (!isAuthenticated()) {
    authManager.showAuthModal();
    return false;
  }
  
  return true;
}