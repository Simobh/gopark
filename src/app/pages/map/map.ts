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

    if (this._userCoords) {
      const userMarker = new this.mapboxgl.Marker({ color: '#ff0000' })
        .setLngLat([this._userCoords.lon, this._userCoords.lat])
        .setPopup(new this.mapboxgl.Popup().setHTML('<strong>Votre départ</strong>'))
        .addTo(this.map);
      
      this.markers.push(userMarker);
      bounds.extend([this._userCoords.lon, this._userCoords.lat]);

      if (shouldFlyToUser) {
        this.map.flyTo({ 
          center: [this._userCoords.lon, this._userCoords.lat], 
          zoom: 16,
          pitch: 60
        });
      }
    }

    this._parkings.forEach(p => {
      if (!p.position?.lat || !p.position?.lon) return;

      const popupNode = document.createElement('div');
      popupNode.className = 'custom-popup';
      popupNode.innerHTML = `
        <div class="p-1">
          <h6 class="fw-bold mb-1">${p.name}</h6>
          <p class="text-muted small mb-2">Adresse : ${p.address ?? 'N/A'}</p>
          <p class="text-muted small mb-2">Ville : ${p.city ?? 'N/A'}</p>
          <p class="text-muted small mb-2">Statut : ${p.status ?? 'N/A'}</p>
          <p class="text-muted small mb-2">Places disponibles : ${p.totalCapacity ?? 'N/A'}</p>
          <button class="btn btn-primary btn-sm w-100 shadow-sm btn-route">
            <i class="bi bi-signpost-split-fill me-1"></i> Tracer l'itinéraire
          </button>
        </div>
      `;

      popupNode.querySelector('.btn-route')?.addEventListener('click', () => {
        if (this._userCoords) {
          this.getRoute([this._userCoords.lon, this._userCoords.lat], [p.position.lon, p.position.lat]);
        } else {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                const userPos: [number, number] = [position.coords.longitude, position.coords.latitude];
                this.getRoute(userPos, [p.position.lon, p.position.lat]);
              },
              (error) => {
                console.error("Erreur de géolocalisation", error);
              }
            );
          } else {
            alert("La géolocalisation n'est pas supportée par votre navigateur.");
          }
        }
      });

      const popup = new this.mapboxgl.Popup({ offset: 25 }).setDOMContent(popupNode);
      const marker = new this.mapboxgl.Marker()
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

  // API Directions Mapbox pour le tracé
  async getRoute(start: [number, number], end: [number, number]) {
    try {
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${this.mapboxToken}`,
        { method: 'GET' }
      );
      const json = await query.json();
      const data = json.routes[0];
      const route = data.geometry.coordinates;

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
          paint: { 'line-color': '#3887be', 'line-width': 5, 'line-opacity': 0.75 }
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

  private removeRoute(): void {
    if (this.map?.getLayer('route')) {
      this.map.removeLayer('route');
      this.map.removeSource('route');
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