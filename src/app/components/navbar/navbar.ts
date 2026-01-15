import { Component, OnInit, OnDestroy, signal, inject, PLATFORM_ID, afterNextRender } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Firestore, collection, collectionData, query, where } from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';


@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit, OnDestroy {
  activeSection = signal<string>('home');
  private observer?: IntersectionObserver;
  protected authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private scrollHandler?: () => void;
    private firestore = inject(Firestore);

  unreadCount$: Observable<number> = collectionData(
    query(
      collection(this.firestore, 'contactMessages'),
      where('read', '==', false)
    )
  ).pipe(map(messages => messages.length));


  constructor() {
    // Utiliser afterNextRender pour s'assurer que le code s'exécute uniquement côté client après le rendu
    afterNextRender(() => {
      if (!this.isBrowser) return;

      // Configuration de l'Intersection Observer pour détecter les sections visibles
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              const sectionId = entry.target.id;
              // Utiliser setTimeout pour éviter ExpressionChangedAfterItHasBeenCheckedError
              setTimeout(() => {
                this.activeSection.set(sectionId);
              }, 0);
            }
          });
        },
        {
          threshold: 0.5, // Au moins 50% de la section doit être visible
          rootMargin: '-100px 0px -50% 0px' // Déclenche un peu avant que la section soit complètement visible
        }
      );

      // Observer toutes les sections après un court délai pour s'assurer que le DOM est prêt
      setTimeout(() => {
        const sections = ['home', 'about', 'services', 'how', 'contact'];
        sections.forEach((id) => {
          const element = document.getElementById(id);
          if (element) {
            this.observer?.observe(element);
          }
        });

        // Définir la section initiale basée sur la position du scroll
        this.updateActiveSectionOnScroll();
      }, 100);

      // Ajouter l'écouteur de scroll
      this.scrollHandler = () => this.updateActiveSectionOnScroll();
      window.addEventListener('scroll', this.scrollHandler);
    });
  }

  async onLogout() {
    await this.authService.logout();
  }

  scrollToHome() {
    if (!this.isBrowser) return;
    const element = document.getElementById('home');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToServices() {
    if (!this.isBrowser) return;
    const element = document.getElementById('services');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToAbout() {
    if (!this.isBrowser) return;
    const element = document.getElementById('about');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  scrollToHow() {
    if (!this.isBrowser) return;
    const element = document.getElementById('how');
    element?.scrollIntoView({ behavior: 'smooth' });
  }

  ngOnInit() {
    // Plus besoin d'initialiser ici, c'est fait dans afterNextRender
  }

  private updateActiveSectionOnScroll() {
    if (!this.isBrowser || typeof window === 'undefined') return;
    
    const sections = ['home', 'about', 'services', 'how', 'contact'];
    const scrollPosition = window.scrollY + 150; // Offset pour la navbar fixe

    for (let i = sections.length - 1; i >= 0; i--) {
      const section = document.getElementById(sections[i]);
      if (section && section.offsetTop <= scrollPosition) {
        // Utiliser setTimeout pour éviter ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          this.activeSection.set(sections[i]);
        }, 0);
        break;
      }
    }
  }

  isActive(sectionId: string): boolean {
    return this.activeSection() === sectionId;
  }

  ngOnDestroy() {
    if (!this.isBrowser) return;
    
    this.observer?.disconnect();
    if (this.scrollHandler && typeof window !== 'undefined') {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }
}
