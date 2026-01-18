import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AddressService {

  private token = 'pk.eyJ1IjoiZ29wYXJrYXBwIiwiYSI6ImNtazViMDB4NjBlMHQzZXI1NDU4M2VjdmcifQ.t9lkBZfjAamz5XlRapSuCg';
  private apiUrl = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

  constructor(private http: HttpClient) {}

  searchAddress(query: string): Observable<any[]> {
    const url = `${this.apiUrl}/${encodeURIComponent(query)}.json`;

    return this.http.get<any>(url, {
      params: {
        access_token: this.token,

        
        country: 'fr',

       
        language: 'fr',

        
        limit: '5',

       
        types: 'address,place,postcode'
      }
    }).pipe(
      map(res => res.features || [])
    );
  }
}
