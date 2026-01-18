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
import { EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-map',
  template: `<div id="map" class="w-100 h-100"></div>`,
  standalone: true
})

export class MapComponent implements AfterViewInit, OnDestroy {

  private map: any;
  private mapboxgl: any;
  private markers: any[] = [];
  private isMapReady = false;
  private _parkings: Parking[] = [];
  private _userCoords: { lat: number; lon: number } | null = null;
  private rotationAnimation: any;
  private mapboxToken = 'pk.eyJ1IjoiZ29wYXJrYXBwIiwiYSI6ImNtazViMDB4NjBlMHQzZXI1NDU4M2VjdmcifQ.t9lkBZfjAamz5XlRapSuCg';

  @Output() reserveClicked = new EventEmitter<Parking>();

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
      zoom: 13,
      pitch: 45,
      bearing: -10
    });

    this.map.on('load', () => {
      this.isMapReady = true;
      const layers = this.map.getStyle().layers;
      const labelLayerId = layers.find(
        (layer: any) => layer.type === 'symbol' && layer.layout['text-field']
      ).id;

      this.map.addLayer(
        {
          'id': 'add-3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#b8b8b8',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15, 0,
              15.05, ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15, 0,
              15.05, ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
      );

      this.map.on('mousedown', () => this.stopRotation());
      this.map.on('touchstart', () => this.stopRotation());
      this.map.on('wheel', () => this.stopRotation());

      this.updateMap();
    });
  }

  public zoomToParking(lat: number, lon: number) {
    if (this.map) {

      this.stopRotation();

      this.map.flyTo({
        center: [lon, lat],
        zoom: 18,           // Zoom plus puissant
        pitch: 65,          // Inclinaison pour l'effet 3D
        bearing: 0,         // Remet face au Nord
        speed: 1.2,
        curve: 1.4,
        essential: true
      });

      // 3. Une fois le "vol" fini, lancer la rotation 360°
      this.map.once('moveend', () => {
        this.startRotation();
      });
    }
  }

  private startRotation() {
    const rotate = () => {
      if (this.map) {
        this.map.setBearing(this.map.getBearing() + 0.2);
        this.rotationAnimation = requestAnimationFrame(rotate);
      }
    };
    rotate();
  }

  private stopRotation() {
    if (this.rotationAnimation) {
      cancelAnimationFrame(this.rotationAnimation);
      this.rotationAnimation = null;
    }
  }

  private updateMap(shouldFlyToUser: boolean = false): void {
    if (!this.map) return;
    this.clearMarkers();
    this.removeRoute();

    const bounds = new this.mapboxgl.LngLatBounds();

    // 1. MARQUEUR UTILISATEUR
    if (this._userCoords) {
      const userMarker = new this.mapboxgl.Marker({ color: '#ff0000' })
        .setLngLat([this._userCoords.lon, this._userCoords.lat])
        .setPopup(new this.mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML('<div class="p-2"><strong>Votre position</strong></div>'))
        .addTo(this.map);

      this.markers.push(userMarker);
      bounds.extend([this._userCoords.lon, this._userCoords.lat]);

      if (shouldFlyToUser) {
        this.map.flyTo({ center: [this._userCoords.lon, this._userCoords.lat], zoom: 14 });
      }
    }

    // 2. MARQUEURS PARKINGS
    this._parkings.forEach(p => {
      if (!p.position?.lat || !p.position?.lon) return;

      const popupNode = document.createElement('div');
      // Pas besoin de classe ici car le parent Mapbox gère le style via 'popup-no-padding'

      // --- Logique Status ---
      const places = p.availablePlaces ?? 0;
      const isFull = places <= 0;
      const statusUpper = (p.status || '').toUpperCase();
      const isOpen = statusUpper === 'OPEN' || statusUpper === 'OUVERT';
      const badgeClass = isOpen ? 'bg-success' : 'bg-danger';

      let displayStatus = p.status;
      if (statusUpper === 'OPEN') displayStatus = 'OUVERT';
      if (statusUpper === 'CLOSED') displayStatus = 'FERMÉ';
      if (statusUpper === 'FULL') displayStatus = 'COMPLET';

      // --- HTML Personnalisé (Header Bleu + Croix Blanche) ---
      popupNode.innerHTML = `
        <div class="card border-0 shadow-none" style="min-width: 260px;">

          <div class="card-header bg-primary text-white d-flex justify-content-between align-items-center py-2 px-3">
             <h6 class="mb-0 fw-bold text-truncate me-2" style="max-width: 200px;" title="${p.name}">
               ${p.name}
             </h6>
             <button type="button" class="btn-close btn-close-white btn-sm btn-close-custom" aria-label="Fermer"></button>
          </div>

          <div class="card-body p-3">
             <p class="text-muted small mb-2 text-truncate">
               <i class="bi bi-geo-alt-fill text-primary"></i> ${p.address ?? 'Adresse inconnue'}
             </p>

             <div class="d-flex justify-content-between align-items-center mb-3">
                <span class="badge ${badgeClass}">${displayStatus}</span>
                <span class="fw-bold small ${isFull ? 'text-danger' : 'text-success'}">
                  ${places} places
                </span>
             </div>

             <div class="d-grid gap-2">
                <button class="btn btn-outline-primary btn-sm fw-bold btn-route">
                  <i class="bi bi-signpost-split-fill me-1"></i> Itinéraire
                </button>

                <button class="btn btn-success btn-sm fw-bold btn-reserve" ${isFull ? 'disabled' : ''}>
                  <i class="bi bi-ticket-perforated-fill me-1"></i> Réserver
                </button>
             </div>
          </div>
        </div>
      `;
      
      popupNode.querySelector('.btn-close-custom')?.addEventListener('click', () => {
        popup.remove(); // Ferme le popup manuellement
      });

      // 2. Clic Itinéraire
      popupNode.querySelector('.btn-route')?.addEventListener('click', () => {
        if (this._userCoords) {
          this.getRoute([this._userCoords.lon, this._userCoords.lat], [p.position.lon, p.position.lat]);
        } else {
           // ... (Logique géolocalisation existante inchangée) ...
           if (navigator.geolocation) {
             navigator.geolocation.getCurrentPosition((pos) => {
                 this.getRoute([pos.coords.longitude, pos.coords.latitude], [p.position.lon, p.position.lat]);
             });
           } else { alert("Géolocalisation indisponible"); }
        }
      });

      // 3. Clic Réserver
      popupNode.querySelector('.btn-reserve')?.addEventListener('click', () => {
        this.reserveClicked.emit(p);
      });

      // --- Création du Popup ---
      const popup = new this.mapboxgl.Popup({
        offset: 25,
        maxWidth: '320px',
        closeButton: false,          // IMPORTANT : On cache la croix par défaut
        className: 'popup-no-padding' // IMPORTANT : On applique le CSS sans marges
      }).setDOMContent(popupNode);

      const marker = new this.mapboxgl.Marker({ color: '#3FB1CE' })
        .setLngLat([p.position.lon, p.position.lat])
        .setPopup(popup)
        .addTo(this.map);

      this.markers.push(marker);
      bounds.extend([p.position.lon, p.position.lat]);
    });

    if (!shouldFlyToUser && !bounds.isEmpty()) {
      this.map.fitBounds(bounds, { padding: 80, maxZoom: 15 });
    }
  }

  @Output() routeCalculated = new EventEmitter<any>();
  private userMarker: any;

  // API Directions Mapbox pour le tracé
  async getRoute(start: [number, number], end: [number, number]) {
    try {
      // 2. Gestion du marqueur rouge sur la position de départ
      if (this.userMarker) this.userMarker.remove();
      this.userMarker = new this.mapboxgl.Marker({ color: 'red' })
        .setLngLat(start)
        .setPopup(new this.mapboxgl.Popup().setHTML('<strong>Position de votre départ</strong>'))
        .addTo(this.map);

      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${this.mapboxToken}`,
        { method: 'GET' }
      );
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;

      // Émettre les infos vers le parent
      this.routeCalculated.emit({
        distance: (data.distance / 1000).toFixed(1), // km
        duration: Math.round(data.duration / 60)    // minutes
      });

      const geojson = {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: route }
      };

      if (this.map.getSource('route')) {
        this.map.getSource('route').setData(geojson);
      } else {
        this.map.addLayer({
          id: 'route',
          type: 'line',
          source: { type: 'geojson', data: geojson },
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: { 'line-color': '#fd0101', 'line-width': 9, 'line-opacity': 1 }
        });
      }

      // Zoomer sur le trajet complet
      const routeBounds = new this.mapboxgl.LngLatBounds();
      route.forEach((coord: [number, number]) => routeBounds.extend(coord));
      this.map.fitBounds(routeBounds, { padding: 60 });

    } catch (error) {
      console.error('Erreur lors du tracé du trajet:', error);
    }
  }

  public removeRoute(): void {
    if (this.map?.getLayer('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
    }
    if (this.userMarker) {
      this.userMarker.remove();
      this.userMarker = null;
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
