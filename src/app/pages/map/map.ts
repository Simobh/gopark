import {
  Component,
  Input,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
  OnDestroy
} from '@angular/core';

import { isPlatformBrowser } from '@angular/common';
import { Parking } from '../../models/parking.model';

@Component({
  selector: 'app-map',
  template: `<div id="map" style="width: 100%; height: 900px; border-radius: 8px;"></div>`,
  standalone: true
})
export class MapComponent implements AfterViewInit, OnDestroy {

  private map: any;
  private mapboxgl: any;
  private markers: any[] = [];
  private isMapReady = false;
  private _parkings: Parking[] = [];
  private _userCoords: { lat: number; lon: number } | null = null;
  private mapboxToken = 'pk.eyJ1IjoiZ29wYXJrYXBwIiwiYSI6ImNtazViMDB4NjBlMHQzZXI1NDU4M2VjdmcifQ.t9lkBZfjAamz5XlRapSuCg';

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  @Input() set parkings(data: Parking[]) {
    this._parkings = data || [];
    if (this.isMapReady) this.updateMap();
  }

  @Input() set userCoords(coords: { lat: number; lon: number } | null) {
    this._userCoords = coords;
    if (this.isMapReady) {
      this.updateMap(!!coords); 
    }
  }

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    this.mapboxgl = await import('mapbox-gl');
    
    this.map = new this.mapboxgl.Map({
      accessToken: this.mapboxToken,
      container: 'map',
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [7.75, 48.57],
      zoom: 12
    });

    this.map.on('load', () => {
      this.isMapReady = true;
      this.updateMap();
    });
  }

  private updateMap(shouldFlyToUser: boolean = false): void {
    if (!this.map) return;

    this.clearMarkers();
    const bounds = new this.mapboxgl.LngLatBounds();
    if (this._userCoords) {
      const userMarker = new this.mapboxgl.Marker({ color: '#ff0000' })
        .setLngLat([this._userCoords.lon, this._userCoords.lat])
        .setPopup(new this.mapboxgl.Popup().setHTML('<strong>Votre destination</strong>'))
        .addTo(this.map);
      
      this.markers.push(userMarker);
      bounds.extend([this._userCoords.lon, this._userCoords.lat]);

      if (shouldFlyToUser) {
        this.map.flyTo({
          center: [this._userCoords.lon, this._userCoords.lat],
          zoom: 15,
          essential: true
        });
      }
    }

    this._parkings.forEach(p => {
      if (!p.position?.lat || !p.position?.lon) return;

      const popupHtml = `
        <div class="p-1">
          <h6 class="fw-bold mb-1">${p.name}</h6>
          <p class="text-muted small mb-2">Capacité : ${p.totalCapacity ?? 'N/A'}</p>
          <div class="row">
            <div class="col-6">
              <button 
                id="btn-parking-${p.id}" 
                class="btn btn-primary btn-sm w-100 shadow-sm">
                Détails
              </button>
            </div>
            <div class="col-6">
              <button 
                id="btn-parking-${p.id}" 
                class="btn btn-success btn-sm w-100 shadow-sm">
                favoris
              </button>
            </div>
          </div>
        </div>
      `;

      const popup = new this.mapboxgl.Popup({ offset: 25 }).setHTML(popupHtml);

      const marker = new this.mapboxgl.Marker()
        .setLngLat([p.position.lon, p.position.lat])
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
      bounds.extend([p.position.lon, p.position.lat]);
    });

    if (!shouldFlyToUser && !bounds.isEmpty()) {
      this.map.fitBounds(bounds, { 
        padding: 80, 
        maxZoom: 15,
        duration: 1500
      });
    }
  }

  private clearMarkers(): void {
    this.markers.forEach(m => m.remove());
    this.markers = [];
  }

  ngOnDestroy(): void {
    if (this.map) this.map.remove();
  }
}