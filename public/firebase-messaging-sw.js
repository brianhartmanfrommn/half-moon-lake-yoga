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

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'Half Moon Lake Yoga';
  const options = {
    body: payload.notification?.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico'
  };
  self.registration.showNotification(title, options);
});
