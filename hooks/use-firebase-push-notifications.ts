'use client';

import { useCallback, useEffect, useState } from 'react';

import { toast } from '@/components/ui/use-toast';
import { registerNotificationDevice } from '@/lib/notifications/api';
import { getFirebaseMessagingToken, onFirebaseForegroundMessage } from '@/lib/firebase/messaging';

type PushState = 'unsupported' | 'default' | 'denied' | 'granted' | 'registered' | 'error';

function getDeviceId() {
  const key = 'sendam-device-id';
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, generated);
  return generated;
}

function getBrowserName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('OPR/') || userAgent.includes('Opera')) return 'Opera';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/')) return 'Safari';
  return 'Browser';
}

function getOperatingSystemName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS X')) return 'macOS';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Unknown OS';
}

function getDeviceName() {
  return `${getBrowserName()} on ${getOperatingSystemName()}`.slice(0, 120);
}

export function useFirebasePushNotifications(token: string | null) {
  const [state, setState] = useState<PushState>('default');
  const [isRegistering, setIsRegistering] = useState(false);

  const registerDevice = useCallback(async () => {
    if (!token || typeof window === 'undefined') return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }

    setIsRegistering(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'default');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const fcmToken = await getFirebaseMessagingToken(registration);
      if (!fcmToken) {
        setState('unsupported');
        return;
      }

      await registerNotificationDevice(token, {
        fcmToken,
        platform: 'WEB',
        deviceId: getDeviceId(),
        deviceName: getDeviceName(),
      });
      setState('registered');
    } catch (error) {
      console.error('[Notifications] Push registration failed:', error);
      setState('error');
    } finally {
      setIsRegistering(false);
    }
  }, [token]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setState('unsupported');
      return;
    }

    setState(Notification.permission);
  }, []);

  useEffect(() => {
    if (state === 'granted') {
      void registerDevice();
    }
  }, [registerDevice, state]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    onFirebaseForegroundMessage((payload) => {
      const title = payload.notification?.title;
      const body = payload.notification?.body;
      if (title) {
        toast({ title, description: body });
      }
    }).then((cleanup) => {
      unsubscribe = cleanup;
    });

    return () => unsubscribe?.();
  }, []);

  return {
    isRegistering,
    registerDevice,
    state,
  };
}
