import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, updateDoc, collectionData, doc, query, where, deleteDoc, getDocs } from '@angular/fire/firestore';
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

  removeHistory(firebaseId: string) {
    const favDoc = doc(this.firestore, `${this.collectionName}/${firebaseId}`);
    return deleteDoc(favDoc);
  }

  async clearUserHistory(userId: string) {
    const q = query(collection(this.firestore, 'history'), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(document => 
      deleteDoc(doc(this.firestore, `history/${document.id}`))
    );
    
    return Promise.all(deletePromises);
  }

}