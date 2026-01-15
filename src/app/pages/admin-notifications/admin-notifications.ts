import { Component, inject } from '@angular/core';
import { Firestore, collection, collectionData, query, orderBy, doc, updateDoc } from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  phone?: string;
  createdAt: any;
  read: boolean;
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-notifications.html',
})
export class AdminNotifications {
  private firestore = inject(Firestore);

  messages$: Observable<ContactMessage[]> = collectionData(
    query(
      collection(this.firestore, 'contactMessages'),
      orderBy('read'),
      orderBy('createdAt', 'desc')
    ),
    { idField: 'id' }
  ) as Observable<ContactMessage[]>;

  markAsRead(id: string) {
    const ref = doc(this.firestore, `contactMessages/${id}`);
    updateDoc(ref, { read: true });
  }
}
