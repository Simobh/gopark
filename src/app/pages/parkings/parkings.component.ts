import { Component, OnInit, OnDestroy, effect, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingService } from '../../services/api.service';
import { GeocodingService } from '../../services/geocoding.service';
import { City } from '../../models/city.model';
import { MapComponent } from '../map/map';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { FavoritesService } from '../../services/favorites.service';
import { Observable, BehaviorSubject, Subscription, switchMap, tap, shareReplay } from 'rxjs';

@Component({
  selector: 'app-parkings',
  standalone: true,
  imports: [CommonModule, MapComponent, FormsModule],
  templateUrl: './parkings.component.html'
})
export class ParkingsComponent implements OnInit, OnDestroy {
    isLoading = false;
    address = '';
    coords: { lat: number; lon: number } | null = null;
    isListVisible = true;
    selectedCity$ = new BehaviorSubject<string>('all'); 
    
    parkings$!: Observable<any[]>;
    user_favoris: any[] = [];
    userId: string | null = null;
    private favSubscription?: Subscription;

    availableCities = [
      { id: 'paris', name: 'Paris' },
      { id: 'strasbourg', name: 'Strasbourg' },
      { id: 'toulouse', name: 'Toulouse' }
    ];

    constructor(
      private parkingService: ParkingService, 
      private geocodingService: GeocodingService,
      public authService: AuthService,
      private favoritesService: FavoritesService,
      private cdr: ChangeDetectorRef // Correction : Injecter le détecteur de changements
    ) {
      effect(() => {
        const user = this.authService.currentUser();
        if (user) {
          this.userId = user.uid;
          this.favSubscription?.unsubscribe();
          // S'abonner aux favoris
          this.favSubscription = this.favoritesService.getFavorites(user.uid).subscribe(favs => {
            this.user_favoris = favs;
            this.cdr.detectChanges(); // Correction : Forcer la mise à jour visuelle des étoiles
          });
        } else {
          this.userId = null;
          this.user_favoris = [];
          this.favSubscription?.unsubscribe();
        }
      });
    }

    ngOnInit(): void {
      this.parkings$ = this.selectedCity$.pipe(
        tap(() => this.isLoading = true),
        switchMap(city => this.parkingService.getParkingsByCity(city as City)),
        tap(() => this.isLoading = false),
        shareReplay(1)
      );
    }

    ngOnDestroy(): void {
      this.favSubscription?.unsubscribe();
    }

    onCityChange(newCity: string) {
      this.selectedCity$.next(newCity);
    }

    searchAddress() {
      if (!this.address.trim()) {
        this.coords = null;
        return;
      }
      this.geocodingService.getCoordinates(this.address).subscribe({
        next: (result) => this.coords = result,
        error: (err) => {
          console.error('Erreur géocodage :', err);
          this.coords = null;
        }
      });
    }

    isFavorite(parkingId: string): any {
      return this.user_favoris.find(f => f.parking.id === parkingId);
    }

    toggleFavorite(parking: any) {
      if (!this.userId) {
        alert("Veuillez vous connecter pour gérer vos favoris.");
        return;
      }

      const favoriteDoc = this.isFavorite(parking.id);

      if (favoriteDoc) {
        this.favoritesService.removeFavorite(favoriteDoc.firebaseId)
          .then(() => console.log('Favori supprimé'))
          .catch(err => console.error('Erreur suppression:', err));
      } else {
        this.favoritesService.addFavorite(this.userId, parking)
          .then(() => console.log('Favori ajouté'))
          .catch(err => console.error('Erreur ajout:', err));
      }
    }
}