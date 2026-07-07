import { getApps, initializeApp } from 'firebase/app';

import { firebaseConfig, hasFirebaseConfig } from './config';

function getFirebaseApp() {
  if (!hasFirebaseConfig()) {
    throw new Error('Firebase web config is missing. Check NEXT_PUBLIC_FIREBASE_* environment variables.');
  }

  return getApps()[0] ?? initializeApp(firebaseConfig);
}

export const firebaseApp = getFirebaseApp;
