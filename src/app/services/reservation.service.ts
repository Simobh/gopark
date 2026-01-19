import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  increment,
  deleteDoc,
  query,
  where,
  collectionData
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private firestore = inject(Firestore);
  private collectionName = 'reservations';

  /**
   * 1. Crée le ticket de réservation
   * 2. Met à jour le compteur (crée le doc parking si inexistant)
   */
  async createReservation(userId: string, parking: any, formData: any): Promise<void> {
    try {
      // --- A. Création du Ticket (Historique) ---
     const reservationData = {
      userId,
      parking,
      date: formData.date,
      arrival: formData.arrival,
      departure: formData.departure,
      licensePlate: formData.plate.toUpperCase(),
      status: 'active',
      createdAt: new Date()
    };


      const reservationsRef = collection(this.firestore, 'reservations');
      await addDoc(reservationsRef, reservationData);

      // --- B. Mise à jour du stock de places ---
      await this.updateParkingStock(parking);

    } catch (error) {
      console.error('Erreur transaction réservation :', error);
      throw error;
    }
  }
  getReservations(userId: string): Observable<any[]> {
    const ref = collection(this.firestore, this.collectionName);
    const q = query(ref, where('userId', '==', userId));
    return collectionData(q, { idField: 'firebaseId' });
  }

  cancelReservation(firebaseId: string) {
    const docRef = doc(this.firestore, `${this.collectionName}/${firebaseId}`);
    return deleteDoc(docRef);
  }

  /**
   * Gère la décrémentation.
   * Si le parking n'est pas dans Firestore, on l'importe de l'API.
   */
  private async updateParkingStock(parking: any) {
    const parkingRef = doc(this.firestore, 'parkings', parking.id);
    const parkingSnap = await getDoc(parkingRef);

    if (parkingSnap.exists()) {
      // CAS 1 : Le parking est déjà connu de Firestore (déjà modifié auparavant)
      // On enlève juste 1 place
      await setDoc(parkingRef, {
        availablePlaces: increment(-1),
        lastUpdated: new Date()
      }, { merge: true });

    } else {
      // CAS 2 : Première fois qu'on touche à ce parking (il vient de l'API)
      // On le crée dans Firestore avec (Places API - 1)
      const currentPlaces = parking.availablePlaces && parking.availablePlaces > 0
                            ? parking.availablePlaces
                            : 0;

      await setDoc(parkingRef, {
        ...parking, // On sauvegarde nom, coords, city, etc. pour usage futur
        availablePlaces: currentPlaces - 1,
        source: 'api_import',
        lastUpdated: new Date()
      });
    }
  }
}
