import { Injectable, signal, computed } from '@angular/core';
import { getFirestore, collection, query, orderBy, onSnapshot, Unsubscribe } from 'firebase/firestore';

export interface YogaClass {
  id: string;
  attendees: string[];
  date: any;
  isCanceled: boolean;
  location: string;
}

declare const __app_id: string;

@Injectable({
  providedIn: 'root'
})
export class YogaDataService {
  private db = getFirestore();
  private unsubscribeSnapshot: Unsubscribe | null = null;

  classes = signal<YogaClass[]>([]);

  sortedClasses = computed(() => {
    return [...this.classes()].sort((a, b) => a.date.seconds - b.date.seconds);
  });

  availableClasses = computed(() => {
    return this.sortedClasses().filter(cls => !cls.isCanceled);
  });

  constructor() {
    this.setupFirestoreListener();
  }

  private setupFirestoreListener() {
    const classesCollection = collection(this.db, 'classes');
    const q = query(classesCollection, orderBy('date'));

    this.unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const classList: YogaClass[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        classList.push({
          id: doc.id,
          attendees: data['attendees'] || [],
          date: data['date'],
          isCanceled: data['isCanceled'] || false,
          location: data['location'] || 'Studio A',
        });
      });
      this.classes.set(classList);
    });
  }
}