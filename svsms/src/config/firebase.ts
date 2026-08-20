import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCuqbHR7XUoHtvccDxcy7VErSmKWWsGezg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "dbms-3ea01.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "dbms-3ea01",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "dbms-3ea01.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "686305872273",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:686305872273:web:68bb5943d97ae7c6f77230",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-XTFYLMJ1ER"
};

let app;
try {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn("Firebase Init Warning:", e);
  app = getApps().length ? getApp() : initializeApp({ apiKey: 'missing', projectId: 'missing' }, 'fallback');
}

export const auth = getAuth(app);
export { app };
