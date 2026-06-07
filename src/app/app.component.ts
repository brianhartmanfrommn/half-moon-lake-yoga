import { ChangeDetectionStrategy, Component, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { setLogLevel } from 'firebase/firestore';
import { Router, RouterModule, NavigationEnd } from '@angular/router';

import { YogaDataService } from './shared/yoga-data.service';

// Material Imports
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

const INSTALL_DISMISSED_KEY = 'install_banner_dismissed';

// Global variables provided by the environment
declare const __initial_auth_token: string;
declare const __deferredInstallPrompt: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule,
    MatToolbarModule, 
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnInit, OnDestroy {
  private auth: any;
  private deferredInstallPrompt: any = null;

  // Auth state signals
  userId = signal<string | null>(null);
  isAuthReady = signal(false);
  isAuthenticated = signal(false);
  isAdmin = signal(false);
  showBackButton = signal(false);

  // Install banner
  showInstallBanner = signal(false);
  isIosBanner = signal(false);

  constructor(private router: Router, private yogaData: YogaDataService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showBackButton.set(event.urlAfterRedirects.includes('/admin'));
      }
    });
  }

  ngOnInit() {
    this.initializeFirebase();
    this.initInstallBanner();
  }

  ngOnDestroy() {
  }

  async initializeFirebase() {
    try {
      this.auth = getAuth();
      setLogLevel('debug');

      // 1. Handle Initial Auth Token if present (e.g., from server-side)
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(this.auth, __initial_auth_token);
      }

      // 2. Listen for Auth State Changes
      onAuthStateChanged(this.auth, async (user: User | null) => {
        if (user) {
          // Check for admin claim
          const tokenResult = await user.getIdTokenResult(true);
          const isUserAdmin = !!tokenResult.claims['admin'];

          this.userId.set(user.uid);
          // isAuthenticated is true for both standard (Google/Apple) and Admin users
          this.isAuthenticated.set(!user.isAnonymous); 
          this.isAdmin.set(isUserAdmin);
        } else {
          // Fallback for logged-out state
          await signInAnonymously(this.auth);
          this.userId.set(crypto.randomUUID());
          this.isAuthenticated.set(false);
          this.isAdmin.set(false);
        }
        this.isAuthReady.set(true);
      });

    } catch (error) {
      console.error('Firebase Initialization Error:', error);
      this.isAuthReady.set(true);
    }
  }

  private initInstallBanner() {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone || localStorage.getItem(INSTALL_DISMISSED_KEY) === 'true') return;

    // Improved iOS detection: Modern iPads identify as MacIntel but have touch points
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIos) {
      this.isIosBanner.set(true);
      this.showInstallBanner.set(true);
      return;
    }

    // Check if the event was already captured by a script in index.html
    if (typeof __deferredInstallPrompt !== 'undefined' && __deferredInstallPrompt) {
      this.deferredInstallPrompt = __deferredInstallPrompt;
      this.showInstallBanner.set(true);
    }

    // Also listen for the event in case it fires after initialization
    window.addEventListener('beforeinstallprompt', (e: Event) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.showInstallBanner.set(true);
    });
  }

  async installApp() {
    if (!this.deferredInstallPrompt) return;
    this.deferredInstallPrompt.prompt();
    const { outcome } = await this.deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
      this.dismissInstallBanner();
    }
    this.deferredInstallPrompt = null;
  }

  dismissInstallBanner() {
    localStorage.setItem(INSTALL_DISMISSED_KEY, 'true');
    this.showInstallBanner.set(false);
  }

  logout() {
    signOut(this.auth).then(() => {
        this.isAdmin.set(false);
        this.isAuthenticated.set(false);
        this.router.navigate(['/']);
    });
  }
}