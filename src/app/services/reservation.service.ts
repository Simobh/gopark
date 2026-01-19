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
  getDocs,
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
      // Construction des dates complètes ISO pour la comparaison
      // Ex: "2024-01-20T14:30:00"
      const fullStart = `${formData.arrivalDate}T${formData.arrival}:00`;
      const fullEnd = `${formData.departureDate}T${formData.departure}:00`;

      // 1. Vérification conflit
      const hasConflict = await this.checkReservationConflict(
        userId,
        formData.plate.toUpperCase(),
        fullStart,
        fullEnd
      );

      if (hasConflict) {
        throw new Error("CONFLICT_DETECTED");
      }

      // 2. Création de l'objet
      const reservationData = {
        userId: userId,
        status: 'active',
        createdAt: new Date(),

        // Données d'affichage (séparées)
        arrivalDate: formData.arrivalDate,
        arrival: formData.arrival,
        departureDate: formData.departureDate,
        departure: formData.departure,
        licensePlate: formData.plate.toUpperCase(),

        // Données techniques (pour le tri et les conflits)
        fullStartTime: fullStart,
        fullEndTime: fullEnd,

        // Objet Parking imbriqué
        parking: {
          id: parking.id,
          name: parking.name,
          city: parking.city,
          address: parking.address || '',
          availablePlaces: parking.availablePlaces,
          totalCapacity: parking.totalCapacity || 0,
          status: parking.status || 'Ouvert',
          position: {
            lat: parking.position.lat,
            lon: parking.position.lon
          }
        }
      };

      const reservationsRef = collection(this.firestore, 'reservations');
      await addDoc(reservationsRef, reservationData);

      // 3. Mise à jour du stock
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
      await setDoc(parkingRef, {
        availablePlaces: increment(-1),
        lastUpdated: new Date()
      }, { merge: true });
    } else {
      const currentPlaces = parking.availablePlaces && parking.availablePlaces > 0
                            ? parking.availablePlaces
                            : 0;
      await setDoc(parkingRef, {
        ...parking,
        availablePlaces: currentPlaces - 1,
        source: 'api_import',
        lastUpdated: new Date()
      });
    }
  }

  async checkReservationConflict(userId: string, plate: string, newStartIso: string, newEndIso: string): Promise<boolean> {
    const reservationsRef = collection(this.firestore, 'reservations');

    // On récupère toutes les réservations actives de l'utilisateur
    const q = query(
      reservationsRef,
      where('userId', '==', userId),
      where('status', '==', 'active')
    );

    const querySnapshot = await getDocs(q);
    const existingReservations = querySnapshot.docs.map(doc => doc.data());

    // Vérification du chevauchement avec des dates complètes
    return existingReservations.some((res: any) => {
      // 1. Si ce n'est pas la même voiture, on ignore
      if (res.licensePlate !== plate) return false;

      // 2. Formule de chevauchement temporel standard
      // (StartA < EndB) et (EndA > StartB)
      // On utilise les champs 'fullStartTime' et 'fullEndTime' qu'on va stocker
      return (newStartIso < res.fullEndTime && newEndIso > res.fullStartTime);
    });
  }


}
