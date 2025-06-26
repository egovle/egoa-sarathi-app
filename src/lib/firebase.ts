// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// Stripped down to essentials to avoid configuration errors.
const firebaseConfig = {
  apiKey: "AIzaSyAVWezupcCQhE6FhdxSgsD1SVPxtjDK72w",
  authDomain: "sevasetu.firebaseapp.com",
  projectId: "sevasetu",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

export { app, db, auth };
