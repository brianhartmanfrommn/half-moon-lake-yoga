importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDvQDKlhzOBaC-PJTEDCRqaDddCVBvgOZE",
  authDomain: "half-moon-lake-yoga.firebaseapp.com",
  projectId: "half-moon-lake-yoga",
  storageBucket: "half-moon-lake-yoga.firebasestorage.app",
  messagingSenderId: "936895918219",
  appId: "1:936895918219:web:7c35b68c24d54c9faa248e"
});

const messaging = firebase.messaging();

// Firebase automatically shows background notifications from the notification payload.
// onBackgroundMessage is intentionally omitted to prevent duplicate notifications.

// Required for Chrome to consider this site PWA-installable.
self.addEventListener('fetch', () => {});
