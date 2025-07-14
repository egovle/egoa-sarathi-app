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
  if (process.env.NODE_ENV === 'development' || window.location.hostname !== 'goasarthi.in') {
    // Use debug token for development environments (including Firebase Studio)
    (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("6LcdeH8rAAAAANnz9thcu5j4-6JYh3Ede8kvvj46"),
      isTokenAutoRefreshEnabled: true
    });
  } else {
    // Use reCAPTCHA for the production domain
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider("6LcdeH8rAAAAANnz9thcu5j4-6JYh3Ede8kvvj46"),
      isTokenAutoRefreshEnabled: true
    });
  }
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };