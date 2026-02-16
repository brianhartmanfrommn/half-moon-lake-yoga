import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject, ChangeDetectorRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { DOCUMENT } from '@angular/common'; 
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar'; // ADDED

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card'; 
import { MatDividerModule } from '@angular/material/divider'; 
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { YogaDataService, YogaClass } from '../shared/yoga-data.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    MatButtonModule, 
    MatCardModule, 
    MatDividerModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatListModule
  ],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss'], 
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private yogaData = inject(YogaDataService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  
  classes = this.yogaData.availableClasses;
  selectedClassId: string | null = null;
  
  @Output() cancelSignup = new EventEmitter<void>(); // Kept for template compatibility, but logic moved

  @ViewChild('nameInput') nameInput!: NgModel;
  @ViewChild('signupForm') signupForm!: NgForm;
  attendeeName: string = '';
  // Removed: message: string | null = null;
  // Removed: messageType: 'success' | 'error' = 'success';
  isProcessing: boolean = false;
  
  // Stores the name of the user who successfully signed up, persisted via cookie.
  registeredName: string | null = null; 

  // Initialize DB instance using the default app initialized in main.ts
  private db: any = getFirestore();
  
  // Inject the DOCUMENT token for safe cookie access
  private document = inject(DOCUMENT);
  
  // Constant for cookie name
  private readonly REGISTERED_NAME_COOKIE = 'yoga_registered_name';
  
  constructor(
      private cdr: ChangeDetectorRef, 
      private snackBar: MatSnackBar // ADDED
    ) { 
      // Initialize registeredName from cookie on construction
      this.registeredName = this.getCookie(this.REGISTERED_NAME_COOKIE);

      if (this.registeredName) {
        this.attendeeName = this.registeredName;
      }

      this.route.paramMap.subscribe(params => {
        this.selectedClassId = params.get('classId');
      });
      
      // Map cancel emit to router back
      this.cancelSignup.subscribe(() => this.router.navigate(['/']));
  }
  
  // --- Cookie Utility Methods (omitted for brevity) ---
  
  private setCookie(name: string, value: string, days: number = 365): void {
      let expires = '';
      if (days) {
          const date = new Date();
          date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
          expires = '; expires=' + date.toUTCString();
      }
      this.document.cookie = name + '=' + (value || '') + expires + '; path=/; Secure; SameSite=Lax';
  }

  private getCookie(name: string): string | null {
      const nameEQ = name + '=';
      const ca = this.document.cookie.split(';');
      for(let i = 0; i < ca.length; i++) {
          let c = ca[i];
          while (c.charAt(0) === ' ') c = c.substring(1, c.length);
          if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
      }
      return null;
  }

  private deleteCookie(name: string): void {
      this.document.cookie = name + '=; Max-Age=-99999999; path=/; Secure; SameSite=Lax';
  }

  // --- End Cookie Utility Methods ---


  get selectedClass(): YogaClass | undefined {
    return this.classes().find(c => c.id === this.selectedClassId);
  }

  formatDateTime(timestamp: any): string {
    return timestamp.toDate().toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  }

  isUserRegistered(): boolean {
      // Checks if the name in the INPUT is registered
      return this.selectedClass?.attendees.includes(this.attendeeName.trim()) || false;
  }

  async handleSignup() {
    if (!this.selectedClassId || !this.attendeeName.trim()) return;

    const name = this.attendeeName.trim();
    const cls = this.selectedClass;

    if (cls && cls.attendees.includes(name)) {
        await this.removeAttendee(name);
        return;
    }

    this.isProcessing = true;

    try {
      const docRef = doc(this.db, `classes`, this.selectedClassId);

      await updateDoc(docRef, {
        attendees: arrayUnion(name)
      });

      this.snackBar.open(`${name}, you are successfully signed up for the class at ${cls?.location}!`, 'Awesome!', {
          duration: 5000,
          panelClass: ['snackbar-success'] // Use custom success style
      });
      
      // Store the name for unsubscription purposes (in state and cookie)
      this.registeredName = name; 
      this.setCookie(this.REGISTERED_NAME_COOKIE, name);

      // Clear the input field to allow other signups or prevent resubmission
      this.signupForm.resetForm({ name: '' });

    } catch (error) {
      console.error('Signup error:', error);
      this.snackBar.open('Error signing up. Please try again.', 'Dismiss', {
          duration: 5000,
          panelClass: ['snackbar-error']
      });
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck(); // Explicitly trigger change detection for local state updates
    }
  }
  
  /**
   * Removes a specific attendee by name (used for the inline Unregister button).
   * @param attendeeName The name of the attendee to remove.
   */
  async removeAttendee(attendeeName: string) {
    if (!this.selectedClassId || !attendeeName.trim()) return;

    const name = attendeeName.trim();
    this.isProcessing = true;

    try {
      const docRef = doc(this.db, `classes`, this.selectedClassId);

      await updateDoc(docRef, {
        attendees: arrayRemove(name)
      });

      this.snackBar.open(`${name} has been successfully removed from the class.`, 'OK', {
          duration: 5000,
          panelClass: ['snackbar-success']
      });
      
      // If the name being removed is the 'registeredName', clear the state.
      if (this.registeredName === name) {
          this.registeredName = null;
          // Clear the input field
          this.signupForm?.resetForm({ name: '' });
      }

    } catch (error) {
      console.error('Removal error:', error);
      this.snackBar.open(`Error removing ${name}. Please try again.`, 'Dismiss', {
          duration: 5000,
          panelClass: ['snackbar-error']
      });
    } finally {
      this.isProcessing = false;
      this.cdr.markForCheck(); // Explicitly trigger change detection for local state updates
    }
  }
}