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
  // This is the SAFEGUARD for local development.
  // We hardcode the debug token you've added to the Firebase Console.
  // This will be ignored in production.
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "10268d83-b4fc-4a24-ac74-5f621e7d19fa";

  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (siteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true
      });
      console.log("App Check with reCAPTCHA initialized.");
    } catch (error) {
      console.error("Error initializing App Check:", error);
    }
  } else {
    console.warn("reCAPTCHA Site Key is not set. App Check will not be initialized on the live site.");
  }
}

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
