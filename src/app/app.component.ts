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

// Global variables provided by the environment
declare const __initial_auth_token: string;

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

  // Auth state signals
  userId = signal<string | null>(null);
  isAuthReady = signal(false);
  isAuthenticated = signal(false);
  isAdmin = signal(false); // Changed from computed to signal to allow async updates
  showBackButton = signal(false);

  constructor(private router: Router, private yogaData: YogaDataService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showBackButton.set(event.urlAfterRedirects.includes('/admin'));
      }
    });
  }

  ngOnInit() {
    this.initializeFirebase();
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

  logout() {
    signOut(this.auth).then(() => {
        this.isAdmin.set(false);
        this.isAuthenticated.set(false);
        this.router.navigate(['/']);
    });
  }
}