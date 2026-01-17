import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, collectionData, doc, deleteDoc, query, where } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private collectionName = 'favorites';

  constructor(private firestore: Firestore) {}

  addFavorite(userId: string, parking: any) {
    const favCollection = collection(this.firestore, this.collectionName);
    return addDoc(favCollection, { parking, userId, createdAt: new Date() });
  }

  getFavorites(userId: string): Observable<any[]> {
    const favCollection = collection(this.firestore, this.collectionName);
    const q = query(favCollection, where('userId', '==', userId));
    return collectionData(q, { idField: 'firebaseId' }); // Retourne un Observable
  }

  removeFavorite(firebaseId: string) {
    const favDoc = doc(this.firestore, `${this.collectionName}/${firebaseId}`);
    return deleteDoc(favDoc);
  }
}