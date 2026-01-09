import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import { ParkingMapperService } from './mapper.service';
import { City } from '../models/city.model';
import { combineLatest } from 'rxjs';

const PARIS_API = 'https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/stationnement-voie-publique-emplacements/records?limit=100';
const STRASBOURG_API = 'https://data.strasbourg.eu/api/explore/v2.1/catalog/datasets/occupation-parkings-temps-reel/records?limit=100';
const TOULOUSE_API = 'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/parcs-de-stationnement/records?limit=100';

@Injectable({ providedIn: 'root' })
export class ParkingService {
  constructor(
    private http: HttpClient,
    private mapper: ParkingMapperService
  ) {}

  getParkingsByCity(city: City) {
    switch (city) {
      case 'paris':
        return this.http.get<any>(PARIS_API).pipe(
          map(res => this.mapper.mapParis(res))
        );

      case 'strasbourg':
        return this.http.get<any>(STRASBOURG_API).pipe(
          map(res => this.mapper.mapStrasbourg(res))
        );

      case 'toulouse':
        return this.http.get<any>(TOULOUSE_API).pipe(
          map(res => this.mapper.mapToulouse(res))
        );
        case 'all':
          return this.getAllParkings();
    }
  }

  getAllParkings() {
    const paris$ = this.http.get<any>(PARIS_API).pipe(
      map(res => this.mapper.mapParis(res))
    );
    const strasbourg$ = this.http.get<any>(STRASBOURG_API).pipe(
      map(res => this.mapper.mapStrasbourg(res))
    );
    const toulouse$ = this.http.get<any>(TOULOUSE_API).pipe(
      map(res => this.mapper.mapToulouse(res))
    );
    return combineLatest([paris$, strasbourg$, toulouse$]).pipe(
      map(([paris, strasbourg, toulouse]) => [
        ...paris,
        ...strasbourg,
        ...toulouse
      ])
    );
  }

}
