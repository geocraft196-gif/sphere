/**
 * Quiz Attempts Management System
 * Handles saving and retrieving quiz attempts
 */

import { db } from './firebase.js';
import { authManager } from './auth.js';
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast, showLoader, hideLoader } from './ui.js';

/**
 * Save a quiz attempt
 * @param {Object} attemptData - Attempt data
 * @param {string} attemptData.passageId - Passage ID
 * @param {string} attemptData.subject - Subject name
 * @param {number} attemptData.score - Score (0-100)
 * @param {Array|Object} attemptData.answers - User answers
 * @param {number} attemptData.timeTakenSec - Time taken in seconds
 * @returns {Promise<string>} - Document ID
 */
export async function saveAttempt(attemptData) {
  if (!authManager.isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const attempt = {
      userId: authManager.currentUser.uid,
      passageId: attemptData.passageId,
      subject: attemptData.subject,
      score: Math.round(attemptData.score), // Ensure integer
      answers: attemptData.answers,
      timeTakenSec: attemptData.timeTakenSec,
      attemptedAt: serverTimestamp(),
      version: 1 // For future schema updates
    };
    
    const docRef = await addDoc(collection(db, 'attempts'), attempt);
    
    showToast('Quiz completed! Results saved.', 'success');
    
    return docRef.id;
  } catch (error) {
    console.error('Error saving attempt:', error);
    showToast('Failed to save quiz results', 'error');
    throw error;
  }
}

/**
 * Get attempts for current user
 * @param {Object} options - Query options
 * @param {string} options.subject - Filter by subject
 * @param {Date} options.startDate - Filter by start date
 * @param {Date} options.endDate - Filter by end date
 * @param {number} options.limitCount - Limit number of results
 * @returns {Promise<Array>} - Array of attempts with IDs
 */
export async function getAttemptsForUser(options = {}) {
  if (!authManager.isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const {
      subject,
      startDate,
      endDate,
      limitCount = 50
    } = options;
    
    let q = collection(db, 'attempts');
    const constraints = [
      where('userId', '==', authManager.currentUser.uid),
      orderBy('attemptedAt', 'desc')
    ];
    
    // Add filters
    if (subject) {
      constraints.push(where('subject', '==', subject));
    }
    
    // Note: Date range filtering would require composite indexes
    // For now, we'll filter client-side
    
    // Add limit
    constraints.push(limit(limitCount));
    
    // Build query
    q = query(q, ...constraints);
    
    const querySnapshot = await getDocs(q);
    let attempts = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      attempts.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamp to Date
        attemptedAt: data.attemptedAt?.toDate() || new Date()
      });
    });
    
    // Client-side date filtering if needed
    if (startDate || endDate) {
      attempts = attempts.filter(attempt => {
        const attemptDate = attempt.attemptedAt;
        if (startDate && attemptDate < startDate) return false;
        if (endDate && attemptDate > endDate) return false;
        return true;
      });
    }
    
    return attempts;
  } catch (error) {
    console.error('Error getting attempts:', error);
    showToast('Failed to load quiz history', 'error');
    throw error;
  }
}

/**
 * Get user statistics
 * @returns {Promise<Object>} - Statistics object
 */
export async function getUserStats() {
  if (!authManager.isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const attempts = await getAttemptsForUser({ limitCount: 1000 });
    
    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        averageScore: 0,
        totalTimeMinutes: 0,
        bestScore: 0,
        recentScore: 0,
        subjectStats: {},
        scoreHistory: []
      };
    }
    
    // Calculate overall stats
    const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score, 0);
    const totalTime = attempts.reduce((sum, attempt) => sum + attempt.timeTakenSec, 0);
    const scores = attempts.map(attempt => attempt.score);
    
    const stats = {
      totalAttempts: attempts.length,
      averageScore: Math.round(totalScore / attempts.length),
      totalTimeMinutes: Math.round(totalTime / 60),
      bestScore: Math.max(...scores),
      recentScore: attempts[0]?.score || 0,
      subjectStats: {},
      scoreHistory: attempts.slice(0, 20).reverse() // Last 20 attempts for chart
    };
    
    // Calculate subject-specific stats
    const subjects = ['Biology', 'Chemistry', 'Physics', 'Geology', 'English'];
    subjects.forEach(subject => {
      const subjectAttempts = attempts.filter(attempt => attempt.subject === subject);
      
      if (subjectAttempts.length > 0) {
        const subjectTotal = subjectAttempts.reduce((sum, attempt) => sum + attempt.score, 0);
        stats.subjectStats[subject] = {
          attempts: subjectAttempts.length,
          averageScore: Math.round(subjectTotal / subjectAttempts.length),
          bestScore: Math.max(...subjectAttempts.map(a => a.score)),
          recentScore: subjectAttempts[0]?.score || 0
        };
      } else {
        stats.subjectStats[subject] = {
          attempts: 0,
          averageScore: 0,
          bestScore: 0,
          recentScore: 0
        };
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Get attempts for a specific passage
 * @param {string} passageId - Passage ID
 * @returns {Promise<Array>} - Array of attempts for the passage
 */
export async function getAttemptsForPassage(passageId) {
  if (!authManager.isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const q = query(
      collection(db, 'attempts'),
      where('userId', '==', authManager.currentUser.uid),
      where('passageId', '==', passageId),
      orderBy('attemptedAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const attempts = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      attempts.push({
        id: doc.id,
        ...data,
        attemptedAt: data.attemptedAt?.toDate() || new Date()
      });
    });
    
    return attempts;
  } catch (error) {
    console.error('Error getting passage attempts:', error);
    throw error;
  }
}

/**
 * Get recent attempts for dashboard
 * @param {number} count - Number of recent attempts to get
 * @returns {Promise<Array>} - Array of recent attempts
 */
export async function getRecentAttempts(count = 10) {
  return getAttemptsForUser({ limitCount: count });
}

/**
 * Check if user can retake a passage (no restrictions for now)
 * @param {string} passageId - Passage ID
 * @returns {Promise<boolean>} - Whether user can retake
 */
export async function canRetakePassage(passageId) {
  // For now, allow unlimited retakes
  // In the future, you might want to implement restrictions
  return true;
}

/**
 * Get performance trends for charts
 * @param {string} subject - Optional subject filter
 * @param {number} days - Number of days to look back
 * @returns {Promise<Object>} - Trend data for charts
 */
export async function getPerformanceTrends(subject = null, days = 30) {
  if (!authManager.isAuthenticated()) {
    throw new Error('Authentication required');
  }
  
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const attempts = await getAttemptsForUser({
      subject,
      startDate,
      limitCount: 1000
    });
    
    // Group by date
    const dailyScores = {};
    attempts.forEach(attempt => {
      const dateKey = attempt.attemptedAt.toDateString();
      if (!dailyScores[dateKey]) {
        dailyScores[dateKey] = [];
      }
      dailyScores[dateKey].push(attempt.score);
    });
    
    // Calculate daily averages
    const trendData = Object.entries(dailyScores).map(([date, scores]) => ({
      date: new Date(date),
      averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
      attemptCount: scores.length
    })).sort((a, b) => a.date - b.date);
    
    return {
      daily: trendData,
      totalAttempts: attempts.length,
      averageScore: attempts.length > 0 
        ? Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length)
        : 0
    };
  } catch (error) {
    console.error('Error getting performance trends:', error);
    throw error;
  }
}