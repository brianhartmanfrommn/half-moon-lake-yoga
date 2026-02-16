import { ChangeDetectionStrategy, Component, computed, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { setLogLevel } from 'firebase/firestore';
import { Router, RouterModule, NavigationEnd } from '@angular/router';

import { YogaDataService } from './shared/yoga-data.service';

// Material Imports
import { MatToolbarModule } from '@angular/material/toolbar'; 
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // ADDED
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';

// Global variables provided by the environment
declare const __app_id: string;
// declare const __firebase_config: string; // REMOVED
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
    MatProgressSpinnerModule, // ADDED
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

  // Auth state
  userId = signal<string | null>(null);
  isAuthReady = signal(false);
  isAuthenticated = signal(false);
  showBackButton = signal(false);

  // --- Computed Properties ---

  // Simple hardcoded admin check
  isAdmin = computed(() => this.isAuthenticated());

  constructor(private router: Router, private yogaData: YogaDataService) {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) {
        this.showBackButton.set(event.urlAfterRedirects.includes('/admin'));
      }
    });
  }

  // --- Initialization and Teardown ---

  ngOnInit() {
    this.initializeFirebase();
  }

  ngOnDestroy() {
  }

  async initializeFirebase() {
    try {
      this.auth = getAuth();

      setLogLevel('debug');

      // 1. Handle Authentication
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(this.auth, __initial_auth_token);
      } else {
        // Only sign in anonymously if not already signed in
        if (!this.auth.currentUser) {
            await signInAnonymously(this.auth);
        }
      }

      onAuthStateChanged(this.auth, (user: User | null) => {
        const currentUserId = user?.uid || crypto.randomUUID();
        this.userId.set(currentUserId);
        this.isAuthenticated.set(!!user && !user.isAnonymous);
        this.isAuthReady.set(true);
      });

    } catch (error) {
      console.error('Firebase Initialization Error:', error);
      this.isAuthReady.set(true);
    }
  }

  logout() {
    signOut(this.auth).then(() => {
        this.router.navigate(['/']);
    });
  }
}