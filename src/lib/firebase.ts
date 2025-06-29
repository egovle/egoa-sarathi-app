
// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
};

// Check if the Firebase API key is provided. If not, the app cannot connect to Firebase.
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your_api_key_here') {
    throw new Error("CRITICAL: Firebase configuration is missing. Please follow these steps: 1. Create a file named .env.local in the root of your project. 2. Copy the contents of .env.local.example into it. 3. Replace the placeholder values with your actual Firebase project credentials. You can find these in your Firebase project settings.");
}

// ---- DIAGNOSTIC LOG ----
// This will print the Project ID to your browser's developer console.
// Check this against the Project ID in your Firebase console's URL to ensure they match.
console.log("Firebase App is connecting to Project ID:", firebaseConfig.projectId);
// ------------------------

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
