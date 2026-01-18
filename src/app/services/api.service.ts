import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ParkingMapperService } from './mapper.service';
import { City } from '../models/city.model';
import { combineLatest, Observable, of } from 'rxjs';
import { Firestore, collection, collectionData } from '@angular/fire/firestore';

// Vos constantes d'URL restent ici...
const PARIS_API = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/stationnement-voie-publique-emplacements/records?limit=100';
const STRASBOURG_API = 'https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/occupation-parkings-temps-reel/records?limit=100';
const TOULOUSE_API = 'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/parcs-de-stationnement/records?limit=100';

@Injectable({ providedIn: 'root' })
export class ParkingService {
  private firestore = inject(Firestore);

  constructor(
    private http: HttpClient,
    private mapper: ParkingMapperService
  ) {}

  // FUSION DES DONNÉES
  private mergeWithFirestore(apiParkings$: Observable<any[]>): Observable<any[]> {
    const firestoreParkings$ = collectionData(collection(this.firestore, 'parkings'), { idField: 'firestoreId' });

    return combineLatest([apiParkings$, firestoreParkings$]).pipe(
      map(([apiList, firestoreList]) => {
        return apiList.map(apiParking => {
          // On cherche le parking dans Firestore
          // On utilise f['id'] ou on cast f en any pour éviter les erreurs de type
          const localOverride = firestoreList.find((f: any) => f['id'] === apiParking.id);

          if (localOverride) {
            // SI TROUVÉ : On utilise les données Firestore
            return {
              ...apiParking,
              // CORRECTION TS(4111) : Accès via crochets
              availablePlaces: localOverride['availablePlaces'],
              status: localOverride['availablePlaces'] === 0 ? 'COMPLET' : apiParking.status
            };
          }

          return apiParking;
        });
      })
    );
  }

  getParkingsByCity(city: City): Observable<any[]> {
    let apiRequest$;

    switch (city) {
      case 'paris':
        apiRequest$ = this.http.get<any>(PARIS_API).pipe(map(res => this.mapper.mapParis(res)));
        break;
      case 'strasbourg':
        apiRequest$ = this.http.get<any>(STRASBOURG_API).pipe(map(res => this.mapper.mapStrasbourg(res)));
        break;
      case 'toulouse':
        apiRequest$ = this.http.get<any>(TOULOUSE_API).pipe(map(res => this.mapper.mapToulouse(res)));
        break;
      case 'all':
        return this.getAllParkings();
      default:
        return of([]);
    }

    return this.mergeWithFirestore(apiRequest$);
  }

  getAllParkings(): Observable<any[]> {
    const paris$ = this.http.get<any>(PARIS_API).pipe(map(res => this.mapper.mapParis(res)));
    const strasbourg$ = this.http.get<any>(STRASBOURG_API).pipe(map(res => this.mapper.mapStrasbourg(res)));
    const toulouse$ = this.http.get<any>(TOULOUSE_API).pipe(map(res => this.mapper.mapToulouse(res)));

    const combinedApi$ = combineLatest([paris$, strasbourg$, toulouse$]).pipe(
      map(([paris, strasbourg, toulouse]) => [
        ...paris,
        ...strasbourg,
        ...toulouse
      ])
    );

    return this.mergeWithFirestore(combinedApi$);
  }
}
