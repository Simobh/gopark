import {
  Component,
  OnInit,
  OnDestroy,
  effect,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingService } from '../../services/api.service';
import { GeocodingService } from '../../services/geocoding.service';
import { AddressService } from '../../services/address.service';
import { City } from '../../models/city.model';
import { MapComponent } from '../map/map';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { FavoritesService } from '../../services/favorites.service';
import { HistoryService } from '../../services/history.service';
import {
  Observable,
  BehaviorSubject,
  Subscription,
  switchMap,
  tap,
  shareReplay,
  take
} from 'rxjs';
import { ActivatedRoute } from '@angular/router';

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

  addressSuggestions: any[] = [];
  isSearchingAddress = false;

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
    private addressService: AddressService,
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
        this.favSubscription = this.favoritesService
          .getFavorites(user.uid)
          .subscribe(favs => {
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
      tap(() => (this.isLoading = true)),
      switchMap(city => this.parkingService.getParkingsByCity(city as City)),
      tap(() => (this.isLoading = false)),
      shareReplay(1)
    );
  }

  ngOnDestroy(): void {
    this.favSubscription?.unsubscribe();
  }

  onCityChange(city: string) {
    this.selectedCity$.next(city);
  }

  // 🔥 AUTOCOMPLETE MAPBOX
  onAddressInput() {
    const query = this.address.trim();

    if (query.length < 3) {
      this.addressSuggestions = [];
      return;
    }

    this.addressService.searchAddress(query).subscribe({
      next: results => this.addressSuggestions = results,
      error: () => this.addressSuggestions = []
    });
  }

  selectAddressSuggestion(s: any) {
    this.address = s.place_name;
    this.addressSuggestions = [];

    this.coords = {
      lon: s.center[0],
      lat: s.center[1]
    };
  }

  searchAddress() {
    if (!this.address.trim()) return;

    this.geocodingService.getCoordinates(this.address).subscribe({
      next: result => (this.coords = result),
      error: () => (this.coords = null)
    });
  }

  focusOnParking(parking: any) {
    if (this.mapComp?.zoomToParking && parking?.position) {
      this.mapComp.zoomToParking(parking.position.lat, parking.position.lon);
    }
    this.addHistory(parking);
  }

  addHistory(parking: any) {
    if (!this.userId) return;
    this.historyService.getHistory(this.userId).pipe(take(1)).subscribe(list => {
      const exists = list.find(h => h.parking.id === parking.id);
      if (exists) {
        this.historyService.updateHistoryDate(exists.firebaseId);
      } else {
        this.historyService.addHistory(this.userId!, parking);
      }
    });
  }

  isFavorite(id: string) {
    return this.user_favoris.find(f => f.parking?.id === id);
  }

  toggleFavorite(parking: any) {
    if (!this.userId) return alert('Veuillez vous connecter');
    const fav = this.isFavorite(parking.id);
    fav
      ? this.favoritesService.removeFavorite(fav.firebaseId)
      : this.favoritesService.addFavorite(this.userId, parking);
  }

  ngAfterViewInit(): void {
    this.route.queryParams.subscribe(params => {
      const lat = +params['lat'];
      const lon = +params['lon'];
      if (!isNaN(lat) && !isNaN(lon)) {
        setTimeout(() => {
          this.mapComp?.zoomToParking(lat, lon);
        }, 800);
      }
    });
  }
}
