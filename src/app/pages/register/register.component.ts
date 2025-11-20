
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);
  
  email = signal('');
  password = signal('');
  confirmPassword = signal('');
  error = signal('');
  loading = signal(false);
  
  async onRegister() {
    if (!this.email() || !this.password() || !this.confirmPassword()) {
      this.error.set('Veuillez remplir tous les champs');
      return;
    }
    
    if (this.password() !== this.confirmPassword()) {
      this.error.set('Les mots de passe ne correspondent pas');
      return;
    }
    
    this.loading.set(true);
    this.error.set('');
    
    try {
      await this.authService.registerWithEmail(this.email(), this.password());
    } catch (error: any) {
      this.error.set(error);
    } finally {
      this.loading.set(false);
    }
  }
  
  async onGoogleRegister() {
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
