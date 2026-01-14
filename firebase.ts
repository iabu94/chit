// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, collection, doc, type Firestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBaM6cECCB0BwGfGSmw-zTzE0w6dpyIBFM",
  authDomain: "chit-draw.firebaseapp.com",
  projectId: "chit-draw",
  storageBucket: "chit-draw.firebasestorage.app",
  messagingSenderId: "29938349107",
  appId: "1:29938349107:web:146a6de82e892e99d05f46",
  measurementId: "G-1R30CBHX5H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Collection references
export const usersCollection = collection(db, "users");
export const raffleConfigDoc = doc(db, "raffle_config", "active");

// Helper function to get user document reference
export const getUserDoc = (userId: string) => doc(db, "users", userId);