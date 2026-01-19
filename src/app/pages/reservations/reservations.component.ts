import { Component, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, of } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';

import { ReservationService } from '../../services/reservation.service';
import { AuthService } from '../../services/auth.service';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, Navbar, Footer, RouterLink],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.css']
})
export class ReservationsComponent {

  ReservationsItems$: Observable<any[]> = of([]);

  constructor(
    private reservationService: ReservationService,
    private authService: AuthService,
    private router: Router
  ) {
    effect(() => {
      const user = this.authService.currentUser();

      if (user) {
        this.ReservationsItems$ = this.reservationService
          .getReservations(user.uid)
          .pipe(
            map(reservations =>
              reservations.filter(r => r.parking && r.parking.position)
            )
          );
      } else {
        this.ReservationsItems$ = of([]);
      }
    });
  }

  formatDate(timestamp: any): Date {
    return timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  }

  goToSearch(): void {
    this.router.navigate(['/search']);
  }

  cancelReservation(reservationId: string) {
    const user = this.authService.currentUser();

    if (!user) {
      Swal.fire({
        icon: 'info',
        title: 'Connexion requise',
        text: 'Veuillez vous connecter pour gérer vos réservations.',
        timer: 3000,
        showConfirmButton: false
      });
      return;
    }

    Swal.fire({
      icon: 'warning',
      title: 'Annuler cette réservation ?',
      text: 'Cette action est irréversible.',
      showCancelButton: true,
      confirmButtonText: 'Oui, annuler',
      cancelButtonText: 'Retour',
      confirmButtonColor: '#dc3545'
    }).then(result => {
      if (result.isConfirmed) {
        this.reservationService.cancelReservation(reservationId)
          .then(() => {
            Swal.fire({
              icon: 'success',
              title: 'Réservation annulée',
              timer: 3000,
              showConfirmButton: false
            });
          })
          .catch(() => {
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Impossible d’annuler la réservation.',
              timer: 3000,
              showConfirmButton: false
            });
          });
      }
    });
  }
}
