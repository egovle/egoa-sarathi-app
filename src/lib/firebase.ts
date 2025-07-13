
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
  try {
    const hostname = window.location.hostname;
    // IMPORTANT: This logic determines whether to use reCAPTCHA or a debug token.
    if (hostname === 'egoasarthi.web.app') {
      // Production environment: Use reCAPTCHA
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6LcdeH8rAAAAANnz9thcu5j4-6JYh3Ede8kvvj46"),
        isTokenAutoRefreshEnabled: true
      });
      console.log("App Check: Initializing with reCAPTCHA for production environment.");
    } else {
      // Development environment: Use debug token
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "10268d83-b4fc-4a24-ac74-5f621e7d19fa";
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6LcdeH8rAAAAANnz9thcu5j4-6JYh3Ede8kvvj46"), // Dummy provider for debug mode
        isTokenAutoRefreshEnabled: true
      });
      console.log("App Check: Initializing with debug token for development environment.");
    }
  } catch (error) {
    console.error("Error initializing App Check:", error);
  }
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
