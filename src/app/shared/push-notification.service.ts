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
  private foregroundListenerRegistered = false;

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

      // Register at a sub-scope so Angular's ngsw-worker.js controls the root
      // and this SW handles only Firebase push events without conflicting.
      const sw = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/firebase-cloud-messaging-push-scope'
      });
      const messaging = getMessaging(getApp());
      const token = await getToken(messaging, {
        vapidKey: environment.vapidKey,
        serviceWorkerRegistration: sw
      });

      if (!token) return 'error';

      const db = getFirestore(getApp());
      const oldToken = localStorage.getItem(TOKEN_KEY);
      if (oldToken && oldToken !== token) {
        await deleteDoc(doc(db, 'subscriptions', oldToken));
      }

      await setDoc(doc(db, 'subscriptions', token), {
        token,
        createdAt: serverTimestamp()
      });

      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(SUBSCRIBED_KEY, 'true');
      this.isSubscribed.set(true);

      if (!this.foregroundListenerRegistered) {
        this.foregroundListenerRegistered = true;
        onMessage(messaging, (payload) => {
          new Notification(payload.notification?.title ?? 'Half Moon Lake Yoga', {
            body: payload.notification?.body ?? '',
            icon: '/favicon.ico'
          });
        });
      }

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
