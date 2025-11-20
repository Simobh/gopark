
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);
  
  async onEmailLogin() {
    if (!this.email() || !this.password()) {
      this.error.set('Veuillez remplir tous les champs');
      return;
    }
    
    this.loading.set(true);
    this.error.set('');
    
    try {
      await this.authService.loginWithEmail(this.email(), this.password());
    } catch (error: any) {
      this.error.set(error);
    } finally {
      this.loading.set(false);
    }
  }
  
  async onGoogleLogin() {
    this.loading.set(true);
    this.error.set('');
    
    try {
      await this.authService.loginWithGoogle();
    } catch (error: any) {
      this.error.set(error);
    } finally {
      this.loading.set(false);
    }
  }
}
