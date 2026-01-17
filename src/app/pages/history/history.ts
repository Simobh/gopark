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
    
    this.historyService.removeHistory(id).then(() => {
      console.log('Item supprimé');
    }).catch(err => console.error("Erreur suppression:", err));
  }

  clearAllHistory() {
    const user = this.authService.currentUser();
    if (!user) return;

    if (confirm("Voulez-vous vraiment effacer tout votre historique ?")) {
      this.historyService.clearUserHistory(user.uid)
        .then(() => console.log('Historique vidé'))
        .catch(err => console.error("Erreur:", err));
    }
  }

}