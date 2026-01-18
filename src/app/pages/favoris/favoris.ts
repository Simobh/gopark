import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FavoritesService } from '../../services/favorites.service';
import { AuthService } from '../../services/auth.service';
import { Observable, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'
import { effect } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import { map } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-favoris',
  imports: [Navbar,CommonModule, Footer, MatIconModule, MatCardModule, MatButtonModule, RouterLink ],
  templateUrl: './favoris.html',
  styleUrl: './favoris.css',
})

export class FavorisComponent implements OnInit {
  FavorisItems$: Observable<any[]> = of([]);
  constructor(
    private favoritesService: FavoritesService,
    private authService: AuthService
  ) {
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.FavorisItems$ = this.favoritesService.getFavorites(user.uid);
      }
    });
  }
   formatDate(timestamp: any): Date {
    return timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  }
  
  ngOnInit(): void {}
  ngAfterViewInit(): void {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document
      .querySelectorAll('.fade-section')
      .forEach(el => observer.observe(el));
  }
    removeFavorite(favoriteId: any) {
  const user = this.authService.currentUser();

    if (!user) {
      Swal.fire({
        icon: 'info',
        title: 'Connexion requise',
        text: 'Veuillez vous connecter pour gérer vos favoris.',
        timer: 4000,
        timerProgressBar: true,
        showConfirmButton: false
      });
      return;
    }

  
      Swal.fire({
        icon: 'warning',
        title: 'Supprimer ce favoris ?',
        text: 'Êtes-vous sûr de vouloir supprimer ce parking de vos favoris ?',
        showCancelButton: true,
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d'
      }).then((result) => {

      if (result.isConfirmed) {
        this.favoritesService.removeFavorite(favoriteId)
          .then(() => {
            Swal.fire({
              icon: 'success',
              title: 'Favori supprimé',
              text: 'Le parking a été retiré de vos favoris.',
              timer: 4000,
              timerProgressBar: true,
              showConfirmButton: false
            });
          })
          .catch(err => {
            console.error('Erreur suppression:', err);
            Swal.fire({
              icon: 'error',
              title: 'Erreur',
              text: 'Une erreur est survenue lors de la suppression.',
              timer: 4000,
              timerProgressBar: true,
              showConfirmButton: false
            });
          });
      }

    });
  }
}
