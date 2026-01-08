import { Component, OnInit } from '@angular/core';
import { ParkingService } from '../../services/api.service';
import { City } from '../../models/city.model';

@Component({
  selector: 'app-parkings',
  templateUrl: './parkings.component.html'
})
export class ParkingsComponent implements OnInit {

  parkings: any[] = [];

  constructor(private parkingService: ParkingService) {}

  ngOnInit(): void {
    const city: City = 'paris'; // change ici

    this.parkingService.getParkingsByCity(city)
      .subscribe({
        next: (data) => {
          console.log('✅ Parkings normalisés :', data);
          this.parkings = data;
        },
        error: (err) => {
          console.error(' Erreur API', err);
        }
      });
  }
}
