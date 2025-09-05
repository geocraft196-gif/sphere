/**
 * Authentication System
 * Handles sign up, sign in, sign out, and auth state management
 */

import { auth, db } from './firebase.js';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast, showLoader, hideLoader } from './ui.js';

class AuthManager {
  constructor() {
    this.currentUser = null;
    this.userRole = null;
    this.googleProvider = new GoogleAuthProvider();
    this.init();
  }

  /**
   * Initialize auth state listener
   */
  init() {
    onAuthStateChanged(auth, async (user) => {
      this.currentUser = user;
      
      if (user) {
        // User is signed in
        await this.loadUserRole();
        await this.updateLastLogin();
        this.updateNavigation();
        this.checkEmailVerification();
      } else {
        // User is signed out
        this.userRole = null;
        this.updateNavigation();
      }
      
      this.checkAuthRequirement();
    });
  }

  /**
   * Load user role from Firestore
   */
  async loadUserRole() {
    if (!this.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', this.currentUser.uid));
      if (userDoc.exists()) {
        this.userRole = userDoc.data().role || 'student';
      } else {
        // Create user document if it doesn't exist
        await this.createUserDocument();
        this.userRole = 'student';
      }
    } catch (error) {
      console.error('Error loading user role:', error);
      this.userRole = 'student'; // Default fallback
    }
  }

  /**
   * Create user document in Firestore
   */
  async createUserDocument() {
    if (!this.currentUser) return;
    
    const userData = {
      email: this.currentUser.email,
      displayName: this.currentUser.displayName || this.currentUser.email.split('@')[0],
      role: 'student',
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'users', this.currentUser.uid), userData);
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin() {
    if (!this.currentUser) return;
    
    try {
      await updateDoc(doc(db, 'users', this.currentUser.uid), {
        lastLoginAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  /**
   * Sign up with email and password
   */
  async signUp(email, password, displayName) {
    try {
      showLoader('Creating account...');
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Update profile with display name
      if (displayName) {
        await updateProfile(user, { displayName });
      }
      
      // Send email verification
      await sendEmailVerification(user);
      
      // Create user document
      await this.createUserDocument();
      
      hideLoader();
      showToast('Account created! Please check your email to verify your account.', 'success');
      
      return user;
    } catch (error) {
      hideLoader();
      this.handleAuthError(error);
      throw error;
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email, password) {
    try {
      showLoader('Signing in...');
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      hideLoader();
      showToast('Welcome back!', 'success');
      
      return userCredential.user;
    } catch (error) {
      hideLoader();
      this.handleAuthError(error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   */
  async signInWithGoogle() {
    try {
      showLoader('Signing in with Google...');
      
      const result = await signInWithPopup(auth, this.googleProvider);
      
      hideLoader();
      showToast('Welcome!', 'success');
      
      return result.user;
    } catch (error) {
      hideLoader();
      this.handleAuthError(error);
      throw error;
    }
  }

  /**
   * Sign out
   */
  async signOutUser() {
    try {
      await signOut(auth);
      showToast('Signed out successfully', 'success');
    } catch (error) {
      this.handleAuthError(error);
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email) {
    try {
      showLoader('Sending reset email...');
      
      await sendPasswordResetEmail(auth, email);
      
      hideLoader();
      showToast('Password reset email sent! Check your inbox.', 'success');
    } catch (error) {
      hideLoader();
      this.handleAuthError(error);
      throw error;
    }
  }

  /**
   * Check if user is admin
   */
  isAdmin() {
    return this.userRole === 'admin';
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Check if email is verified
   */
  isEmailVerified() {
    return this.currentUser?.emailVerified || false;
  }

  /**
   * Update navigation based on auth state
   */
  updateNavigation() {
    const authLinks = document.querySelector('.auth-links');
    const userMenu = document.querySelector('.user-menu');
    
    if (this.currentUser) {
      // Hide auth links, show user menu
      if (authLinks) authLinks.style.display = 'none';
      if (userMenu) {
        userMenu.style.display = 'block';
        
        // Update user info
        const userName = document.getElementById('user-name');
        const userAvatar = document.getElementById('user-avatar');
        
        if (userName) {
          userName.textContent = this.currentUser.displayName || this.currentUser.email.split('@')[0];
        }
        if (userAvatar) {
          userAvatar.textContent = (this.currentUser.displayName || this.currentUser.email).charAt(0).toUpperCase();
        }
        
        // Show/hide admin menu item
        this.updateAdminMenu();
      }
    } else {
      // Show auth links, hide user menu
      if (authLinks) authLinks.style.display = 'flex';
      if (userMenu) userMenu.style.display = 'none';
    }
    
    // Update admin controls visibility
    this.updateAdminControls();
  }

  /**
   * Update admin menu visibility
   */
  updateAdminMenu() {
    const adminMenuItem = document.getElementById('admin-menu-item');
    if (adminMenuItem) {
      adminMenuItem.style.display = this.isAdmin() ? 'block' : 'none';
    }
  }

  /**
   * Update admin controls visibility
   */
  updateAdminControls() {
    const adminControls = document.querySelectorAll('.admin-only');
    adminControls.forEach(control => {
      if (this.isAdmin()) {
        control.style.display = '';
      } else {
        control.remove(); // Remove from DOM for security
      }
    });
  }

  /**
   * Check email verification and show warning if needed
   */
  checkEmailVerification() {
    if (this.currentUser && !this.isEmailVerified()) {
      const verificationBanner = document.getElementById('email-verification-banner');
      if (verificationBanner) {
        verificationBanner.style.display = 'block';
      }
    }
  }

  /**
   * Check if current page requires authentication
   */
  checkAuthRequirement() {
    const protectedPages = ['dashboard.html', 'admin.html'];
    const currentPage = window.location.pathname.split('/').pop();
    
    if (protectedPages.includes(currentPage)) {
      if (!this.isAuthenticated()) {
        this.showAuthModal();
        return;
      }
      
      if (currentPage === 'admin.html' && !this.isAdmin()) {
        showToast('Access denied. Admin privileges required.', 'error');
        window.location.href = 'dashboard.html';
        return;
      }
    }
  }

  /**
   * Show authentication modal
   */
  showAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.add('show');
    }
  }

  /**
   * Hide authentication modal
   */
  hideAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  /**
   * Handle authentication errors
   */
  handleAuthError(error) {
    console.error('Auth error:', error);
    
    let message = 'An error occurred. Please try again.';
    
    switch (error.code) {
      case 'auth/user-not-found':
        message = 'No account found with this email address.';
        break;
      case 'auth/wrong-password':
        message = 'Incorrect password.';
        break;
      case 'auth/email-already-in-use':
        message = 'An account with this email already exists.';
        break;
      case 'auth/weak-password':
        message = 'Password should be at least 6 characters.';
        break;
      case 'auth/invalid-email':
        message = 'Please enter a valid email address.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many failed attempts. Please try again later.';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in cancelled.';
        break;
      case 'auth/network-request-failed':
        message = 'Network error. Please check your connection.';
        break;
    }
    
    showToast(message, 'error');
  }
}

// Global auth manager instance
export const authManager = new AuthManager();

// Global functions for HTML onclick handlers
window.toggleUserMenu = function() {
  const dropdown = document.getElementById('user-dropdown-menu');
  if (dropdown) {
    dropdown.classList.toggle('show');
  }
};

window.signOut = function() {
  if (confirm('Are you sure you want to sign out?')) {
    authManager.signOutUser();
  }
};

// Close dropdown when clicking outside
document.addEventListener('click', function(e) {
  const userMenu = document.querySelector('.user-dropdown');
  if (userMenu && !userMenu.contains(e.target)) {
    const dropdown = document.getElementById('user-dropdown-menu');
    if (dropdown) {
      dropdown.classList.remove('show');
    }
  }
});

// Auth modal event handlers
document.addEventListener('DOMContentLoaded', function() {
  // Sign up form
  const signUpForm = document.getElementById('signup-form');
  if (signUpForm) {
    signUpForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('signup-email').value;
      const password = document.getElementById('signup-password').value;
      const confirmPassword = document.getElementById('signup-confirm-password').value;
      const displayName = document.getElementById('signup-name').value;
      
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }
      
      try {
        await authManager.signUp(email, password, displayName);
        authManager.hideAuthModal();
      } catch (error) {
        // Error already handled in signUp method
      }
    });
  }
  
  // Sign in form
  const signInForm = document.getElementById('signin-form');
  if (signInForm) {
    signInForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('signin-email').value;
      const password = document.getElementById('signin-password').value;
      
      try {
        await authManager.signIn(email, password);
        authManager.hideAuthModal();
      } catch (error) {
        // Error already handled in signIn method
      }
    });
  }
  
  // Password reset form
  const resetForm = document.getElementById('reset-form');
  if (resetForm) {
    resetForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const email = document.getElementById('reset-email').value;
      
      try {
        await authManager.resetPassword(email);
      } catch (error) {
        // Error already handled in resetPassword method
      }
    });
  }
  
  // Google sign in buttons
  const googleButtons = document.querySelectorAll('.google-signin-btn');
  googleButtons.forEach(button => {
    button.addEventListener('click', async function() {
      try {
        await authManager.signInWithGoogle();
        authManager.hideAuthModal();
      } catch (error) {
        // Error already handled in signInWithGoogle method
      }
    });
  });
});