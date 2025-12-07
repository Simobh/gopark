import { Component } from '@angular/core';
import { Navbar } from '../../components/navbar/navbar';
import { About } from '../about/about';
import { Services } from '../services/services';
import { HowItWorks } from '../how-it-works/how-it-works';
import { Contact } from '../contact/contact';

@Component({
  selector: 'app-landing-page',
  imports: [Navbar, About, Services, HowItWorks, Contact],
  templateUrl: './landing-page.html',
  styleUrls: ['./landing-page.css']
})
export class LandingPageComponent {
  scrollToServices() {
    const element = document.getElementById('services');
    element?.scrollIntoView({ behavior: 'smooth' });
  }
}
