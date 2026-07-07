import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import type { MessagePayload } from 'firebase/messaging';

import { firebaseVapidKey, hasFirebaseConfig } from './config';
import { firebaseApp } from './client';

export async function getFirebaseMessagingToken(
  serviceWorkerRegistration?: ServiceWorkerRegistration,
) {
  if (!hasFirebaseConfig() || !(await isSupported()) || !firebaseVapidKey) {
    return null;
  }

  const messaging = getMessaging(firebaseApp());
  return getToken(messaging, {
    vapidKey: firebaseVapidKey,
    serviceWorkerRegistration,
  });
}

export async function onFirebaseForegroundMessage(next: (payload: MessagePayload) => void) {
  if (!hasFirebaseConfig() || !(await isSupported())) {
    return () => {};
  }

  return onMessage(getMessaging(firebaseApp()), next);
}
