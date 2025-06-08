import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyClsnT-an9eDXT4CVNXKSWdoJJjiB0giMo",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "games-ssocieyt-1ac1b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "games-ssocieyt-1ac1b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "games-ssocieyt-1ac1b.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "778559098767",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:778559098767:web:9f2580ff0b1767d69e45fa",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4Q3DQC416G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;