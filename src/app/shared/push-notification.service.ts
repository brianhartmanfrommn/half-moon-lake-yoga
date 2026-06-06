import { Injectable, signal } from '@angular/core';
import { getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, deleteToken } from 'firebase/messaging';
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'push_token';
const SUBSCRIBED_KEY = 'push_subscribed';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  readonly isSubscribed = signal(localStorage.getItem(SUBSCRIBED_KEY) === 'true');

  isSupported(): boolean {
    return typeof window !== 'undefined'
      && 'Notification' in window
      && 'serviceWorker' in navigator
      && 'PushManager' in window;
  }

  async subscribe(): Promise<'granted' | 'denied' | 'error'> {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return 'denied';

      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      const messaging = getMessaging(getApp());
      const token = await getToken(messaging, {
        vapidKey: environment.vapidKey,
        serviceWorkerRegistration: sw
      });

      if (!token) return 'error';

      await setDoc(doc(getFirestore(getApp()), 'subscriptions', token), {
        token,
        createdAt: serverTimestamp()
      });

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(SUBSCRIBED_KEY, 'true');
      this.isSubscribed.set(true);

      // Show in-app notifications when the tab is in the foreground
      onMessage(messaging, (payload) => {
        new Notification(payload.notification?.title ?? 'Half Moon Lake Yoga', {
          body: payload.notification?.body ?? '',
          icon: '/favicon.ico'
        });
      });

      return 'granted';
    } catch (err) {
      console.error('[PushNotification] subscribe failed:', err);
      return 'error';
    }
  }

  async unsubscribe(): Promise<void> {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await deleteDoc(doc(getFirestore(getApp()), 'subscriptions', token));
        await deleteToken(getMessaging(getApp()));
      }
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(SUBSCRIBED_KEY);
      this.isSubscribed.set(false);
    }
  }
}
