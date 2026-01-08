import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ParkingService } from '../../services/api.service';
import { City } from '../../models/city.model';

@Component({
  selector: 'app-parkings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './parkings.component.html',
  styleUrl: './parkings.component.css'
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
