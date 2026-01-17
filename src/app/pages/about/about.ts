import { Component, inject, PLATFORM_ID} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-about',
  imports: [CommonModule],
  templateUrl: './about.html',
  styleUrl: './about.css'
})
export class About {

  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  scrollToContact() {
    console.log('Scrolling to contact section');
    if (!this.isBrowser) return;
    const element = document.getElementById('contact');
    element?.scrollIntoView({ behavior: 'smooth' });
  }
}
