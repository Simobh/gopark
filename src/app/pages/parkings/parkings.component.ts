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
import { ReservationService } from '../../services/reservation.service';
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
  routeInfo: { distance: string; duration: number } | null = null;
  hide_parking_list = false;


  showReservationModal = false;
  selectedParking: any = null;
  bookingForm = {
    arrivalDate: new Date().toISOString().split('T')[0],   // Date arrivée
    arrival: '',                                           // Heure arrivée
    departureDate: new Date().toISOString().split('T')[0], // Date départ
    departure: '',                                         // Heure départ
    plate: ''
  };

  availableCities = [
    { id: 'paris', name: 'Paris' },
    { id: 'strasbourg', name: 'Strasbourg' },
    { id: 'toulouse', name: 'Toulouse' }
  ];

  constructor(
    private parkingService: ParkingService,
    private geocodingService: GeocodingService,
    private reservationService: ReservationService,
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
  formatDuration(minutes: number): string {
    if (!minutes) return '';

    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h > 0) {
      // Si on a des heures (ex: 90min -> 1h 30 min)
      // Si m est 0, on affiche juste "1 h"
      return `${h} h ${m > 0 ? m + ' min' : ''}`;
    }

    // Sinon on affiche juste les minutes
    return `${m} min`;
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

  handleRoute(info: any) {
    this.routeInfo = info;
    this.cdr.detectChanges();
  }

  clearRoute() {
    this.routeInfo = null;
    if (this.mapComp) {
      this.mapComp.removeRoute();
    }
  }

  toggleParkingList() {
    this.hide_parking_list = !this.hide_parking_list;
  }
  openReservation(parking: any) {
    if (!this.userId) {
      Swal.fire('Oups', 'Connectez-vous pour réserver.', 'info');
      return;
    }
    if ((parking.availablePlaces || 0) <= 0) {
      Swal.fire('Complet', 'Ce parking est complet.', 'warning');
      return;
    }

    this.selectedParking = parking;

    // Reset du formulaire avec dates du jour par défaut
    const today = new Date().toISOString().split('T')[0];
    this.bookingForm = {
      arrivalDate: today,
      arrival: '',
      departureDate: today,
      departure: '',
      plate: ''
    };

    this.showReservationModal = true;
  }

  closeReservation() {
    this.showReservationModal = false;
    this.selectedParking = null;
    this.bookingForm = {
      arrivalDate: new Date().toISOString().split('T')[0],
      arrival: '',
      departureDate: new Date().toISOString().split('T')[0],
      departure: '',
      plate: ''
    };
  }

  get minDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  // 3. Valide la réservation via le Service
  async confirmReservation() {
    // 1. Vérification champs vides
    if (!this.bookingForm.arrival || !this.bookingForm.departure ||
        !this.bookingForm.plate || !this.bookingForm.arrivalDate ||
        !this.bookingForm.departureDate) {
      Swal.fire('Champs manquants', 'Merci de remplir tous les champs.', 'error');
      return;
    }

    // 2. Validation Matricule
    const plateRegex = /^[A-Za-z]{2}-\d{3}-[A-Za-z]{2}$/;
    if (!plateRegex.test(this.bookingForm.plate)) {
      Swal.fire('Format invalide', 'La plaque doit être au format AA-123-BB.', 'warning');
      return;
    }

    // 3. Validation Temporelle (Dates complètes)
    const start = new Date(`${this.bookingForm.arrivalDate}T${this.bookingForm.arrival}`);
    const end = new Date(`${this.bookingForm.departureDate}T${this.bookingForm.departure}`);
    const now = new Date();

    // A. Pas dans le passé
    if (start < now) {
      Swal.fire('Date invalide', 'Le début de la réservation ne peut pas être dans le passé.', 'warning');
      return;
    }

    // B. Fin après début
    if (end <= start) {
      Swal.fire('Incohérence', 'La date de départ doit être postérieure à la date d\'arrivée.', 'warning');
      return;
    }

    this.isLoading = true;

    try {
      await this.reservationService.createReservation(
        this.userId!,
        this.selectedParking,
        this.bookingForm
      );

      if (this.selectedParking.availablePlaces) {
        this.selectedParking.availablePlaces--;
      }
      this.isLoading = false;
      this.closeReservation();

      Swal.fire({
        icon: 'success',
        title: 'Place réservée !',
        text: 'Votre réservation est désormais disponible dans la page "Mes réservations"',
        timer: 3000,
        showConfirmButton: false
      });

    } catch (error: any) {
      this.isLoading = false;
      if (error.message === 'CONFLICT_DETECTED') {
        Swal.fire({
          icon: 'error',
          title: 'Créneau indisponible',
          text: 'Ce véhicule a déjà une réservation sur cette période.',
        });
      } else {
        console.error(error);
        Swal.fire('Erreur', 'Impossible de confirmer la réservation.', 'error');
      }
    }
  }
}
