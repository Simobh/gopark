import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, Navbar, Footer],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.css']
})
export class ReservationsComponent {

  constructor(private router: Router) {}

  goToSearch(): void {
    this.router.navigate(['/search']);
  }
}
