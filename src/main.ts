// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';


const firebaseConfig = {
  // Add 'as any' to bypass the TypeScript error
  apiKey: (import.meta as any).env.VITE_FIREBASE_API_KEY,
  authDomain: "half-moon-lake-yoga.firebaseapp.com",
  projectId: "half-moon-lake-yoga",
  storageBucket: "half-moon-lake-yoga.appspot.com",
  messagingSenderId: "784863371694",
  appId: "1:784863371694:web:046395e86820df38c467a1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));