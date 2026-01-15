import { AfterViewInit, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-historique',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './historique.html',
  styleUrl: './historique.css',
})
export class HistoriqueComponent implements AfterViewInit {

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
}
