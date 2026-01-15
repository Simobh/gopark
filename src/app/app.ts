import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HostListener } from '@angular/core';
import { Navbar } from "./components/navbar/navbar";


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, Navbar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('gopark');

  showBackToTop = false;

  @HostListener('window:scroll')
  onScroll() {
    this.showBackToTop = window.scrollY > 300;
  }

  scrollTop() { 
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}


