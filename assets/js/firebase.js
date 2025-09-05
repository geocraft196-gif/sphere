/**
 * Firebase Configuration and Initialization
 * Reads config from inline script tag in HTML
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Read Firebase config from HTML script tag
function getFirebaseConfig() {
  const configElement = document.getElementById('firebase-config');
  if (!configElement) {
    throw new Error('Firebase config not found. Please add <script type="application/json" id="firebase-config"> with your Firebase config.');
  }
  
  try {
    return JSON.parse(configElement.textContent);
  } catch (error) {
    throw new Error('Invalid Firebase config JSON: ' + error.message);
  }
}

// Initialize Firebase
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);

// Connect to emulators in development (uncomment for local testing)
// if (location.hostname === 'localhost') {
//   connectAuthEmulator(auth, 'http://localhost:9099');
//   connectFirestoreEmulator(db, 'localhost', 8080);
// }

console.log('Firebase initialized successfully');