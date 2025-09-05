/**
 * Passage Management System
 * Handles CRUD operations for passages
 */

import { db } from './firebase.js';
import { authManager } from './auth.js';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast, showLoader, hideLoader } from './ui.js';

/**
 * Create a new passage (admin only)
 * @param {Object} passageData - Passage data
 * @returns {Promise<string>} - Document ID
 */
export async function createPassage(passageData) {
  if (!authManager.isAdmin()) {
    throw new Error('Admin privileges required');
  }
  
  try {
    showLoader('Creating passage...');
    
    const passage = {
      ...passageData,
      createdBy: authManager.currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isPublished: passageData.isPublished || false
    };
    
    const docRef = await addDoc(collection(db, 'passages'), passage);
    
    hideLoader();
    showToast('Passage created successfully', 'success');
    
    return docRef.id;
  } catch (error) {
    hideLoader();
    console.error('Error creating passage:', error);
    showToast('Failed to create passage', 'error');
    throw error;
  }
}

/**
 * Update an existing passage (admin only)
 * @param {string} passageId - Passage ID
 * @param {Object} updates - Updates to apply
 */
export async function updatePassage(passageId, updates) {
  if (!authManager.isAdmin()) {
    throw new Error('Admin privileges required');
  }
  
  try {
    showLoader('Updating passage...');
    
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    await updateDoc(doc(db, 'passages', passageId), updateData);
    
    hideLoader();
    showToast('Passage updated successfully', 'success');
  } catch (error) {
    hideLoader();
    console.error('Error updating passage:', error);
    showToast('Failed to update passage', 'error');
    throw error;
  }
}

/**
 * Delete a passage (admin only)
 * @param {string} passageId - Passage ID
 */
export async function deletePassage(passageId) {
  if (!authManager.isAdmin()) {
    throw new Error('Admin privileges required');
  }
  
  try {
    showLoader('Deleting passage...');
    
    await deleteDoc(doc(db, 'passages', passageId));
    
    hideLoader();
    showToast('Passage deleted successfully', 'success');
  } catch (error) {
    hideLoader();
    console.error('Error deleting passage:', error);
    showToast('Failed to delete passage', 'error');
    throw error;
  }
}

/**
 * Get a single passage by ID
 * @param {string} passageId - Passage ID
 * @returns {Promise<Object|null>} - Passage data with ID
 */
export async function getPassage(passageId) {
  try {
    const docSnap = await getDoc(doc(db, 'passages', passageId));
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting passage:', error);
    showToast('Failed to load passage', 'error');
    throw error;
  }
}

/**
 * Get passages with optional filtering
 * @param {Object} options - Query options
 * @param {string} options.subject - Filter by subject
 * @param {string} options.difficulty - Filter by difficulty
 * @param {boolean} options.publishedOnly - Only published passages (default: true for students)
 * @param {number} options.limitCount - Limit number of results
 * @param {string} options.orderByField - Field to order by (default: 'createdAt')
 * @param {string} options.orderDirection - Order direction (default: 'desc')
 * @returns {Promise<Array>} - Array of passages with IDs
 */
export async function getPassages(options = {}) {
  try {
    const {
      subject,
      difficulty,
      publishedOnly = !authManager.isAdmin(), // Students see only published
      limitCount,
      orderByField = 'createdAt',
      orderDirection = 'desc'
    } = options;
    
    let q = collection(db, 'passages');
    const constraints = [];
    
    // Add filters
    if (subject) {
      constraints.push(where('subject', '==', subject));
    }
    
    if (difficulty) {
      constraints.push(where('difficulty', '==', difficulty));
    }
    
    if (publishedOnly) {
      constraints.push(where('isPublished', '==', true));
    }
    
    // Add ordering
    constraints.push(orderBy(orderByField, orderDirection));
    
    // Add limit
    if (limitCount) {
      constraints.push(limit(limitCount));
    }
    
    // Build query
    if (constraints.length > 0) {
      q = query(q, ...constraints);
    }
    
    const querySnapshot = await getDocs(q);
    const passages = [];
    
    querySnapshot.forEach((doc) => {
      passages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return passages;
  } catch (error) {
    console.error('Error getting passages:', error);
    showToast('Failed to load passages', 'error');
    throw error;
  }
}

/**
 * Get passages by subject for students (published only)
 * @param {string} subject - Subject name
 * @returns {Promise<Array>} - Array of published passages
 */
export async function getPublishedPassagesBySubject(subject) {
  return getPassages({
    subject,
    publishedOnly: true,
    orderByField: 'title',
    orderDirection: 'asc'
  });
}

/**
 * Search passages by title
 * @param {string} searchTerm - Search term
 * @param {Object} options - Additional options
 * @returns {Promise<Array>} - Array of matching passages
 */
export async function searchPassages(searchTerm, options = {}) {
  try {
    // Note: Firestore doesn't support full-text search natively
    // This is a simple implementation that gets all passages and filters client-side
    // For production, consider using Algolia or similar service
    
    const passages = await getPassages(options);
    
    if (!searchTerm) {
      return passages;
    }
    
    const searchLower = searchTerm.toLowerCase();
    return passages.filter(passage => 
      passage.title.toLowerCase().includes(searchLower) ||
      passage.content.toLowerCase().includes(searchLower)
    );
  } catch (error) {
    console.error('Error searching passages:', error);
    showToast('Search failed', 'error');
    throw error;
  }
}

/**
 * Toggle passage published status (admin only)
 * @param {string} passageId - Passage ID
 * @param {boolean} isPublished - New published status
 */
export async function togglePassagePublished(passageId, isPublished) {
  if (!authManager.isAdmin()) {
    throw new Error('Admin privileges required');
  }
  
  try {
    await updatePassage(passageId, { isPublished });
    
    const status = isPublished ? 'published' : 'unpublished';
    showToast(`Passage ${status} successfully`, 'success');
  } catch (error) {
    console.error('Error toggling passage status:', error);
    throw error;
  }
}

/**
 * Get passage statistics for admin dashboard
 * @returns {Promise<Object>} - Statistics object
 */
export async function getPassageStats() {
  if (!authManager.isAdmin()) {
    throw new Error('Admin privileges required');
  }
  
  try {
    const allPassages = await getPassages({ publishedOnly: false });
    
    const stats = {
      total: allPassages.length,
      published: allPassages.filter(p => p.isPublished).length,
      drafts: allPassages.filter(p => !p.isPublished).length,
      bySubject: {}
    };
    
    // Count by subject
    const subjects = ['Biology', 'Chemistry', 'Physics', 'Geology', 'English'];
    subjects.forEach(subject => {
      stats.bySubject[subject] = allPassages.filter(p => p.subject === subject).length;
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting passage stats:', error);
    throw error;
  }
}