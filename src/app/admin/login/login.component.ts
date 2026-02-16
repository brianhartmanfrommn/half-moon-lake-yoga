import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider, 
} from 'firebase/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatCardModule, MatButtonModule, 
    MatInputModule, MatFormFieldModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  private auth = getAuth();
  private router = inject(Router);

  email = '';
  password = '';
  isProcessing = false;

  async loginEmail() {
    if (!this.email || !this.password) return;
    this.isProcessing = true;
    try {
      await signInWithEmailAndPassword(this.auth, this.email, this.password);
      this.router.navigate(['/admin']);
    } catch (e) {
      console.error(e);
      alert('Login failed');
    } finally {
      this.isProcessing = false;
    }
  }

  async loginGoogle() {
    this.isProcessing = true;
    try {
      await signInWithPopup(this.auth, new GoogleAuthProvider());
      this.router.navigate(['/admin']);
    } catch (e) {
      console.error(e);
    } finally {
      this.isProcessing = false;
    }
  }

  async loginApple() {
    this.isProcessing = true;
    try {
      const provider = new OAuthProvider('apple.com');
      await signInWithPopup(this.auth, provider);
      this.router.navigate(['/admin']);
    } catch (e) {
      console.error(e);
    } finally {
      this.isProcessing = false;
    }
  }
}