import { Component, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  query,
  orderBy,
  doc,
  updateDoc
} from '@angular/fire/firestore';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { Navbar } from '../../components/navbar/navbar';
import { trigger, transition, style, animate } from '@angular/animations';
import { Footer } from "../../components/footer/footer";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  phone?: string;
  createdAt: any;
  read: boolean;
  starred?: boolean;
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, MatIconModule, Navbar, Footer],
  templateUrl: './admin-notifications.html',
  animations: [
    trigger('slideFade', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px)' }),
        animate(
          '280ms cubic-bezier(.4,0,.2,1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ]),
      transition(':leave', [
        animate(
          '200ms ease-in',
          style({ opacity: 0, transform: 'translateY(12px)' })
        )
      ])
    ])
  ]
})
export class AdminNotifications {
  private firestore = inject(Firestore);

  allMessages: ContactMessage[] = [];

  messages$: Observable<ContactMessage[]> = collectionData(
    query(
      collection(this.firestore, 'contactMessages'),
      orderBy('read'),
      orderBy('createdAt', 'desc')
    ),
    { idField: 'id' }
  ) as Observable<ContactMessage[]>;

  constructor() {
    this.messages$.subscribe(messages => {
      this.allMessages = messages;
    });
  }

  get unreadMessages(): ContactMessage[] {
    return this.allMessages.filter(m => !m.read);
  }

  get readMessages(): ContactMessage[] {
    return this.allMessages.filter(m => m.read);
  }

  markAsRead(id: string) {
    this.allMessages = this.allMessages.map(m =>
      m.id === id ? { ...m, read: true } : m
    );

    const ref = doc(this.firestore, `contactMessages/${id}`);
    updateDoc(ref, { read: true });
  }

  copyEmail(email: string) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(email);
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = email;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

}
