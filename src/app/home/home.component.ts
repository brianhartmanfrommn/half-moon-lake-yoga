/* src/app/home/home.component.ts */
import { ChangeDetectionStrategy, Component, signal, computed, inject, effect, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// Import Angular Material Modules for UI components
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { YogaDataService, YogaClass } from '../shared/yoga-data.service';

/**
 * Helper to check if two Dates represent the same day.
 * Used for filtering classes into the correct calendar cells.
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule, 
    MatButtonModule, 
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private yogaData = inject(YogaDataService);
  private router = inject(Router);
  
  // Access the stream of sorted classes from the data service
  classesSignal = this.yogaData.sortedClasses;

  constructor() {
    // Automatically initialize the selection once data is loaded
    effect(() => {
      const classes = this.sortedClasses();
      if (classes.length > 0 && untracked(this.selectedEventIndex) === -1) {
        this.initializeSelection();
      }
    });
  }

  // --- Calendar State & Properties ---

  private today = new Date();
  // View state for the calendar, default to the current month
  currentMonth = signal<Date>(new Date()); 

  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // --- Filtered and Computed State ---

  /**
   * Filter classes to only show current and future events.
   */
  sortedClasses = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this.classesSignal().filter(c => c.date.toDate() >= now).sort((a, b) => {
      const dateA = a.date.toDate();
      const dateB = b.date.toDate();
      return dateA.getTime() - dateB.getTime();
    });
  });

  selectedEventIndex = signal<number>(-1);
  selectedDate = signal<Date | null>(null);

  /**
   * The currently highlighted event based on navigation.
   */
  selectedEvent = computed(() => {
    const classes = this.sortedClasses();
    const index = this.selectedEventIndex();
    return (index >= 0 && index < classes.length) ? classes[index] : null;
  });

  /**
   * Formats the selected date for the mobile navigation header.
   */
  mobileSelectedDate = computed(() => {
    const date = this.selectedDate();
    if (!date) return 'SELECT A DAY';

    const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
    const day = date.getDate();
    
    return `${dayName} ${day}<sup>${this.getOrdinal(day)}</sup>`;
  });

  private initializeSelection() {
    const classes = this.sortedClasses();
    if (classes.length === 0) return;
    
    const now = new Date();
    // Find the first event today or in the future to show initially
    let index = classes.findIndex(c => {
        const d = c.date.toDate();
        return d >= now || isSameDay(d, now);
    });

    if (index === -1) index = 0;

    this.selectedEventIndex.set(index);
    this.updateMonthFromEvent(classes[index]);
  }

  private updateMonthFromEvent(event: YogaClass) {
    const date = event.date.toDate();
    this.currentMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
    this.selectedDate.set(date);
  }

  displayMonth = computed(() => {
    return this.currentMonth().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  /**
   * Generates the 2D grid for the calendar month.
   */
  calendarDays = computed(() => {
    const date = this.currentMonth();
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startingDayOfWeek = firstDayOfMonth.getDay(); 
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const calendar: (Date | null)[][] = [];
    let currentWeek: (Date | null)[] = [];

    // Add preceding padding days
    for (let i = 0; i < startingDayOfWeek; i++) {
      currentWeek.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month, day);
      currentWeek.push(currentDate);

      if (currentWeek.length === 7) {
        calendar.push(currentWeek);
        currentWeek = [];
      }
    }

    // Add trailing padding days
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      calendar.push(currentWeek);
    }

    return calendar;
  });

  // --- Navigation Methods ---

  previousMonth(): void {
    this.currentMonth.update(date => new Date(date.getFullYear(), date.getMonth() - 1, 1));
  }

  nextMonth(): void {
    this.currentMonth.update(date => new Date(date.getFullYear(), date.getMonth() + 1, 1));
  }

  prevEvent(): void {
    const idx = this.selectedEventIndex();
    if (idx > 0) {
      this.selectedEventIndex.set(idx - 1);
      this.updateMonthFromEvent(this.sortedClasses()[idx - 1]);
    }
  }

  nextEvent(): void {
    const idx = this.selectedEventIndex();
    if (idx < this.sortedClasses().length - 1) {
      this.selectedEventIndex.set(idx + 1);
      this.updateMonthFromEvent(this.sortedClasses()[idx + 1]);
    }
  }

  // --- Utility Methods ---

  isToday(day: Date | null): boolean {
    if (!day) return false;
    return isSameDay(day, this.today);
  }

  getClassesForDay(day: Date): YogaClass[] {
    if (!day) return [];
    return this.sortedClasses().filter(cls => isSameDay(cls.date.toDate(), day));
  }

  isCanceledDay(classes: YogaClass[]): boolean {
    return classes.length > 0 && classes.every(c => c.isCanceled);
  }

  /**
   * Handles day clicks. On mobile, selects the event. On desktop, navigates to signup.
   */
  handleDayClick(cls: YogaClass[]): void {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    // RESTORED: Find first class (even if canceled) to allow selection on mobile
    const activeClass = cls[0];

    if (!activeClass) return;

    if (isMobile) {
      const index = this.sortedClasses().findIndex(c => c.id === activeClass.id);
      if (index !== -1) {
        this.selectedEventIndex.set(index);
        this.updateMonthFromEvent(activeClass);
      }
    } else if (!activeClass.isCanceled) {
      // On desktop, only navigate if NOT canceled
      this.bookClass(activeClass);
    }
  }

  bookClass(cls: YogaClass): void {
    this.router.navigate(['/signup', cls.id]);
  }

  formatDate(timestamp: any): string {
    return timestamp.toDate().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  formatTime(timestamp: any): string {
    return timestamp.toDate().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  private getOrdinal(n: number) {
    if (n > 3 && n < 21) return 'th';
    switch (n % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  }
}