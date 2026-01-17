import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, collectionData, doc, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HistoryService {
  private collectionName = 'history';

  constructor(private firestore: Firestore) {}

  addHistory(userId: string, parking: any) {
    const histCollection = collection(this.firestore, this.collectionName);
    return addDoc(histCollection, { parking, userId, searchedAt: new Date() });
  }

  getHistory(userId: string): Observable<any[]> {
    const histCollection = collection(this.firestore, this.collectionName);
    const q = query(histCollection, where('userId', '==', userId));
    return collectionData(q, { idField: 'firebaseId' });
  }

  updateHistoryDate(firebaseId: string) {
    const docRef = doc(this.firestore, `${this.collectionName}/${firebaseId}`);
    return updateDoc(docRef, { 
      searchedAt: new Date() 
    });
  }
}