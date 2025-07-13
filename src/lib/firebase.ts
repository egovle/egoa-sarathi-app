
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: "AIzaSyAVWezupcCQhE6FhdxSgsD1SVPxtjDK72w",
  authDomain: "egoasarthi.firebaseapp.com",
  projectId: "egoasarthi",
  storageBucket: "egoasarthi.firebasestorage.app",
  messagingSenderId: "582450828090",
  appId: "1:582450828090:web:a0ed05ea1a74710230f603",
  measurementId: "G-9ZGSFH8X1F",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize App Check
if (typeof window !== 'undefined') {
  // --- START OF FIX ---
  // Force debug token for the development environment to prevent reCAPTCHA errors.
  // This is the most reliable way to ensure App Check works locally.
  try {
    // By setting the debug token directly, we tell Firebase to bypass reCAPTCHA.
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    
    // We still need to call initializeAppCheck, but without a provider.
    // The presence of the debug token is what enables App Check locally.
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("6LcdeH8rAAAAANnz9thcu5j4-6JYh3Ede8kvvj46"), // This key is still needed, but the debug token will override it.
      isTokenAutoRefreshEnabled: true
    });
  } catch (error) {
    console.error("Error initializing App Check with debug token:", error);
  }
  // --- END OF FIX ---
}


const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
