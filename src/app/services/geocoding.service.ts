import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class GeocodingService {

  private token = 'pk.eyJ1IjoiZ29wYXJrYXBwIiwiYSI6ImNtazViMDB4NjBlMHQzZXI1NDU4M2VjdmcifQ.t9lkBZfjAamz5XlRapSuCg';

  constructor(private http: HttpClient) {}

  getCoordinates(address: string) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      address
    )}.json?access_token=${this.token}&limit=1`;

    return this.http.get<any>(url).pipe(
      map(res => {
        const feature = res.features?.[0];
        if (!feature) return null;

        return {
          lon: feature.center[0],
          lat: feature.center[1]
        };
      })
    );
  }
}
