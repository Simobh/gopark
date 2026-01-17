import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { Footer } from '../../components/footer/footer';
import { About } from '../about/about';
import { Services } from '../services/services';
import { HowItWorks } from '../how-it-works/how-it-works';
import { Contact } from '../contact/contact';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [Navbar, Footer, About, Services, HowItWorks, Contact, RouterLink],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css']
})
export class LandingPageComponent {
  scrollToServices() {
    const element = document.getElementById('services');
    element?.scrollIntoView({ behavior: 'smooth' });
  }
}
