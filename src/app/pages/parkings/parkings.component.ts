import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingService } from '../../services/api.service';
import { GeocodingService } from '../../services/geocoding.service';
import { City } from '../../models/city.model';
import { MapComponent } from '../map/map';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap, tap, finalize, shareReplay } from 'rxjs';

@Component({
  selector: 'app-parkings',
  standalone: true,
  imports: [CommonModule, MapComponent, FormsModule],
  templateUrl: './parkings.component.html'
})
export class ParkingsComponent implements OnInit {
  isLoading = false;
  address = '';
  coords: { lat: number; lon: number } | null = null;
  isListVisible = true;
  selectedCity$ = new BehaviorSubject<string>('all'); 
  
  parkings$!: Observable<any[]>;

  availableCities = [
    { id: 'paris', name: 'Paris' },
    { id: 'strasbourg', name: 'Strasbourg' },
    { id: 'toulouse', name: 'Toulouse' }
  ];

  constructor(
    private parkingService: ParkingService, 
    private geocodingService: GeocodingService
  ) {}

  ngOnInit(): void {
    this.parkings$ = this.selectedCity$.pipe(
      tap(() => this.isLoading = true),
      switchMap(city => this.parkingService.getParkingsByCity(city as City)),
      tap(() => this.isLoading = false),
      shareReplay(1)
    );
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
    next: (result) => {
      this.coords = result;
    },
    error: (err) => {
      console.error('Erreur géocodage :', err);
      this.coords = null;
    }
  });
}
toggleList() {
  this.isListVisible = !this.isListVisible;
  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
}
}