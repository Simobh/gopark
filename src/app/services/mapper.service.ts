import { Injectable } from '@angular/core';
import { Parking } from '../models/parking.model';

@Injectable({
  providedIn: 'root'
})
export class ParkingMapperService {

  /* ===================== PARIS ===================== */
  mapParis(apiResponse: any): Parking[] {
    if (!apiResponse?.results) return [];

    return apiResponse.results.map((r: any, index: number): Parking => {
      const address = [r.numvoie, r.typevoie, r.nomvoie]
        .filter(Boolean)
        .join(' ');

      return {
        id: r.id_old ?? `paris-${index}`,
        name: `Stationnement ${r.locsta ?? ''}`.trim(),
        city: 'paris',

        position: {
          lat: r.geo_point_2d?.lat,
          lon: r.geo_point_2d?.lon
        },

        address: address || undefined,
        availablePlaces: r.plarel ?? undefined,
        totalCapacity: r.placal ?? undefined,
        status: r.placal > 0 ? 'OPEN' : 'UNKNOWN'
      };
    });
  }

  /* ===================== STRASBOURG ===================== */
  mapStrasbourg(apiResponse: any): Parking[] {
    if (!apiResponse?.results) return [];

    return apiResponse.results.map((r: any): Parking => ({
      id: String(r.ident),
      name: r.nom_parking,
      city: 'strasbourg',

      position: {
        lat: r.position?.lat,
        lon: r.position?.lon
      },
      address: r.idsurfs + ' ' + r.nom_parking + ' 67000 Strasbourg' || undefined,
      availablePlaces: r.libre,
      totalCapacity: r.total,

      status:
        r.etat_descriptif?.toLowerCase() === 'ouvert'
          ? 'OPEN'
          : 'CLOSED'
    }));
  }

  /* ===================== TOULOUSE ===================== */
  mapToulouse(apiResponse: any): Parking[] {
    if (!apiResponse?.results) return [];

    return apiResponse.results.map((r: any): Parking => ({
      id: r.id,
      name: r.nom,
      city: 'toulouse',

      position: {
        lat: r.geo_point_2d?.lat ?? r.ylat,
        lon: r.geo_point_2d?.lon ?? r.xlong
      },

      address: r.adresse,
      availablePlaces:
        r.nb_places && r.nb_voitures
          ? r.nb_places - r.nb_voitures
          : undefined,

      totalCapacity: r.nb_places,
      status: 'UNKNOWN'
    }));
  }
}
