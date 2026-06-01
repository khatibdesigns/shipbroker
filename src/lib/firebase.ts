// Guarded Firebase init. The app runs fully without configuration (local-only
// state); cloud auth + sync activate once EXPO_PUBLIC_FIREBASE_* are present in .env.
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
// getReactNativePersistence is exported by the RN build but missing from the
// web types, hence the require/cast below.
import { initializeAuth, getAuth, Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cfg = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const isConfigured = !!(cfg.apiKey && cfg.projectId && cfg.appId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

if (isConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(cfg as any);
  try {
    auth = initializeAuth(app, {
      persistence: (require('firebase/auth') as any).getReactNativePersistence(AsyncStorage),
    });
  } catch {
    auth = getAuth(app);
  }
  firestore = getFirestore(app);
}

export { app, auth, firestore };
