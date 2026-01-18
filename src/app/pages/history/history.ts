import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HistoryService } from '../../services/history.service';
import { AuthService } from '../../services/auth.service';
import { Observable, of } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon'
import { effect } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { RouterLink } from '@angular/router';
import { Footer } from '../../components/footer/footer';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-history',
  standalone: true,
  imports: [Navbar,CommonModule, Footer, MatIconModule, MatCardModule, MatButtonModule, RouterLink ],
  templateUrl: './history.html',
  styleUrl: './history.css',
})

export class HistoryComponent implements OnInit {
  historyItems$: Observable<any[]> = of([]);

  constructor(
    private historyService: HistoryService,
    private authService: AuthService
  ) {

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.historyItems$ = this.historyService.getHistory(user.uid);
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

  removeHistoryItem(id: string) {
  if (!id) return;

  Swal.fire({
    icon: 'warning',
    title: 'Supprimer cet élément ?',
    text: 'Êtes-vous sûr de vouloir supprimer cet élément de votre historique ?',
    showCancelButton: true,
    confirmButtonText: 'Oui, supprimer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d'
  }).then(result => {

    if (result.isConfirmed) {
      this.historyService.removeHistory(id)
        .then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Supprimé',
            text: 'L’élément a été supprimé de votre historique.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        })
        .catch(err => {
          console.error("Erreur suppression:", err);
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


  clearAllHistory() {
  const user = this.authService.currentUser();
  if (!user) {
    Swal.fire({
      icon: 'info',
      title: 'Connexion requise',
      text: 'Veuillez vous connecter pour gérer votre historique.',
      timer: 4000,
      timerProgressBar: true,
      showConfirmButton: false
    });
    return;
  }

  Swal.fire({
    icon: 'warning',
    title: 'Effacer tout l’historique ?',
    text: 'Cette action est irréversible. Voulez-vous vraiment supprimer tout votre historique ?',
    showCancelButton: true,
    confirmButtonText: 'Oui, tout effacer',
    cancelButtonText: 'Annuler',
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d'
  }).then(result => {

    if (result.isConfirmed) {
      this.historyService.clearUserHistory(user.uid)
        .then(() => {
          Swal.fire({
            icon: 'success',
            title: 'Historique effacé',
            text: 'Votre historique a été entièrement supprimé.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        })
        .catch(err => {
          console.error("Erreur:", err);
          Swal.fire({
            icon: 'error',
            title: 'Erreur',
            text: 'Impossible d’effacer l’historique.',
            timer: 4000,
            timerProgressBar: true,
            showConfirmButton: false
          });
        });
    }

  });
}


}