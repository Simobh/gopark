import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LandingPageComponent } from "./pages/landing-page/landing-page";
import { Services } from "./pages/services/services";
import { HowItWorks } from "./pages/how-it-works/how-it-works";
import { Contact } from "./pages/contact/contact";
import { About } from "./pages/about/about";
import { Navbar } from "./components/navbar/navbar";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LandingPageComponent, Services, HowItWorks, Contact, About, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('gopark');
}
