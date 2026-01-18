import { Component, OnInit, OnDestroy, effect, ChangeDetectorRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingService } from '../../services/api.service';
import { GeocodingService } from '../../services/geocoding.service';
import { City } from '../../models/city.model';
import { MapComponent } from '../map/map';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { FavoritesService } from '../../services/favorites.service';
import { HistoryService } from '../../services/history.service';
import { Observable, BehaviorSubject, Subscription, switchMap, tap, shareReplay, take } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-parkings',
  standalone: true,
  imports: [CommonModule, MapComponent, FormsModule],
  templateUrl: './parkings.component.html'
})
export class ParkingsComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(MapComponent) mapComp!: MapComponent;

  isLoading = false;
  address = '';
  coords: { lat: number; lon: number } | null = null;
  isListVisible = true;
  selectedCity$ = new BehaviorSubject<string>('all'); 
  suggestions: any[] = [];
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
    private historyService: HistoryService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute
  ) {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.userId = user.uid;
        this.favSubscription?.unsubscribe();
        this.favSubscription = this.favoritesService.getFavorites(user.uid).subscribe(favs => {
          this.user_favoris = favs;
          this.cdr.detectChanges();
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

  focusOnParking(parking: any) {
    if (this.mapComp && parking.position && parking.position.lat && parking.position.lon) {
      this.mapComp.zoomToParking(parking.position.lat, parking.position.lon);
    }
    this.addHistory(parking);
  }

  displayLocation(lat: any, lon: any) {
    if (this.mapComp && lat && lon) {
      this.mapComp.zoomToParking(lat, lon);
    }
  }

  addHistory(parking: any) {
    if (!this.userId) return;
    this.historyService.getHistory(this.userId).pipe(take(1)).subscribe(list => {
      const dupe = list.find(item => item.parking.id === parking.id);

      if (dupe) {
        this.historyService.updateHistoryDate(dupe.firebaseId).catch(err => console.error('Erreur mise à jour historique :', err));
      } else {
        this.historyService.addHistory(this.userId!, parking).catch(err => console.error('Erreur ajout historique :', err));
      }
    });
  }

  isFavorite(parkingId: string): any {
    return this.user_favoris.find(f => f.parking && f.parking.id === parkingId);
  }

 toggleFavorite(parking: any) {
        if (!this.userId) {
          Swal.fire({
            icon: 'info',
            title: 'Connexion requise',
            text: 'Veuillez vous connecter pour gérer vos favoris.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
          return;
        }

    const favoriteDoc = this.isFavorite(parking.id);

    //  Suppression des favoris
    if (favoriteDoc) {
      this.favoritesService.removeFavorite(favoriteDoc.firebaseId)
        .then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Favori supprimé',
            text: 'Ce parking a été retiré de vos favoris.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        })
        .catch(err => {
          console.error('Erreur suppression:', err);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Impossible de supprimer ce favori.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        });

    // Ajout aux favoris
    } else {
      this.favoritesService.addFavorite(this.userId, parking)
        .then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Ajouté aux favoris',
            text: 'Ce parking a été ajouté à vos favoris.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        })
        .catch(err => {
          console.error('Erreur ajout:', err);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Impossible d’ajouter ce parking aux favoris.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        });
    }
  }

  ngAfterViewInit(): void {
    this.route.queryParams.subscribe(params => {
      console.log('Paramètres reçus :', params);

      const lat = parseFloat(params['lat']);
      const lon = parseFloat(params['lon']);

      if (!isNaN(lat) && !isNaN(lon)) {
        console.log(`Tentative de zoom sur : ${lat}, ${lon}`);
        
        setTimeout(() => {
          if (this.mapComp) {
            console.log('MapComponent trouvé, appel de zoomToParking', this.mapComp);
            this.displayLocation(lat, lon);
          } else {
            console.error('MapComponent est toujours indéfini (@ViewChild a échoué)');
          }
        }, 10000);
      } else {
        console.warn('Coordonnées lat/lon invalides ou absentes de l\'URL');
      }
    });
  }

  onAddressInput() {
    if (this.address.length > 3) {
      this.geocodingService.getSuggestions(this.address).subscribe(results => {
        this.suggestions = results;
      });
    } else {
      this.suggestions = [];
    }
  }

  selectSuggestion(suggestion: any) {
    this.address = suggestion.fullAddress;
    this.suggestions = [];
    this.coords = suggestion.coords;
    this.searchAddress();
  }

}