import { ChangeDetectionStrategy, Component, inject, computed, ViewChild, AfterViewInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, collection, Timestamp, serverTimestamp } from 'firebase/firestore';
import { YogaDataService, YogaClass } from '../shared/yoga-data.service';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatListModule
  ],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminComponent implements AfterViewInit {
  private yogaData = inject(YogaDataService);
  private router = inject(Router);
  private auth = getAuth();

  // Updated to sort newest to oldest
  classes = computed(() => [...this.yogaData.sortedClasses()].reverse());
  dataSource = new MatTableDataSource<YogaClass>([]);

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  displayedColumns: string[] = ['date', 'location', 'attendees', 'status', 'actions'];
  timeSlots: { value: string, label: string }[] = [];

  constructor() {
    if (!this.auth.currentUser || this.auth.currentUser.isAnonymous) {
        this.router.navigate(['/admin/login']);
    }
    this.generateTimeSlots();

    effect(() => {
      this.dataSource.data = this.classes();
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  private generateTimeSlots() {
    for (let h = 5; h <= 22; h++) {
      for (let m = 0; m < 60; m += 15) {
        const date = new Date();
        date.setHours(h, m);
        this.timeSlots.push({
          value: `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`,
          label: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        });
      }
    }
  }

  newClassDate: Date | null = null;
  newClassTime: string = '';
  newClassLocation: string = '';
  isProcessing: boolean = false;
  message: string | null = null;
  messageType: 'success' | 'error' = 'success';
  
  isEditing: boolean = false;
  editingId: string | null = null;
  editAttendees: string[] = [];
  newAttendeeName: string = '';

  private db: any = getFirestore();

  formatDateTime(timestamp: any): string {
    return timestamp.toDate().toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  }

  async addNewClass() {
    if (!this.newClassDate || !this.newClassLocation || !this.newClassTime) return;

    this.isProcessing = true;
    this.message = null;

    try {
      const date = new Date(this.newClassDate);
      const [hours, minutes] = this.newClassTime.split(':');
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));

      const classTimestamp = Timestamp.fromDate(date);
      const classesCollection = collection(this.db, 'classes');

      await addDoc(classesCollection, {
        attendees: [],
        date: classTimestamp,
        isCanceled: false,
        location: this.newClassLocation.trim(),
        createdAt: serverTimestamp()
      });

      this.messageType = 'success';
      this.message = `New class scheduled successfully at ${this.newClassLocation}.`;
      this.newClassDate = null;
      this.newClassTime = '';
      this.newClassLocation = '';

    } catch (error) {
      console.error('Error adding class:', error);
      this.messageType = 'error';
      this.message = 'Error scheduling class. Check console for details.';
    } finally {
      this.isProcessing = false;
    }
  }

  startEdit(cls: YogaClass) {
    this.isEditing = true;
    this.editingId = cls.id;
    this.message = null;

    const date = cls.date.toDate();
    this.newClassDate = date;
    
    const h = date.getHours().toString().padStart(2, '0');
    const m = date.getMinutes().toString().padStart(2, '0');
    this.newClassTime = `${h}:${m}`;
    
    this.newClassLocation = cls.location;
    this.editAttendees = [...cls.attendees];
    this.newAttendeeName = '';

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit() {
    this.isEditing = false;
    this.editingId = null;
    this.newClassDate = null;
    this.newClassTime = '';
    this.newClassLocation = '';
    this.editAttendees = [];
    this.newAttendeeName = '';
    this.message = null;
  }

  async updateClass() {
    if (!this.editingId || !this.newClassDate || !this.newClassLocation || !this.newClassTime) return;

    this.isProcessing = true;
    this.message = null;

    try {
      const date = new Date(this.newClassDate);
      const [hours, minutes] = this.newClassTime.split(':');
      date.setHours(parseInt(hours, 10));
      date.setMinutes(parseInt(minutes, 10));

      const classTimestamp = Timestamp.fromDate(date);
      const docRef = doc(this.db, `classes`, this.editingId);

      await updateDoc(docRef, {
        date: classTimestamp,
        location: this.newClassLocation.trim(),
        attendees: this.editAttendees
      });

      this.cancelEdit();
      this.messageType = 'success';
      this.message = `Class updated successfully.`;

    } catch (error) {
      console.error('Error updating class:', error);
      this.messageType = 'error';
      this.message = 'Error updating class. Check console for details.';
    } finally {
      this.isProcessing = false;
    }
  }

  addAttendee() {
    if (this.newAttendeeName.trim()) {
      this.editAttendees.push(this.newAttendeeName.trim());
      this.newAttendeeName = '';
    }
  }

  removeAttendee(index: number) {
    this.editAttendees.splice(index, 1);
  }

  async toggleCancel(cls: YogaClass) {
    this.isProcessing = true;
    this.message = null;

    try {
      const docRef = doc(this.db, `classes`, cls.id);
      const newStatus = !cls.isCanceled;

      await updateDoc(docRef, {
        isCanceled: newStatus
      });

      this.messageType = 'success';
      this.message = `Class at ${cls.location} has been ${newStatus ? 'CANCELED' : 'RE-ACTIVATED'}.`;

    } catch (error) {
      console.error('Error toggling cancel status:', error);
      this.messageType = 'error';
      this.message = 'Error updating status. Check console for details.';
    } finally {
      this.isProcessing = false;
    }
  }

  async deleteClass(classId: string) {
    this.isProcessing = true;
    this.message = null;

    try {
      const docRef = doc(this.db, `classes`, classId);
      await deleteDoc(docRef);
      this.messageType = 'success';
      this.message = `Class successfully deleted.`;
    } catch (error) {
      console.error('Error deleting class:', error);
      this.messageType = 'error';
      this.message = 'Error deleting class. Check console for details.';
    } finally {
      this.isProcessing = false;
    }
  }
}