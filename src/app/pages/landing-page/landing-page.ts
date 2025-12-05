import { Component } from '@angular/core';

@Component({
  selector: 'app-landing-page',
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css']
})
export class LandingPageComponent {
  scrollToServices() {
    const element = document.getElementById('services');
    element?.scrollIntoView({ behavior: 'smooth' });
  }
}
