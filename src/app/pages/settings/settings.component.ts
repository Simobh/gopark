
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, RouterLink],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  authService = inject(AuthService);
  
  error = signal('');
  success = signal('');
  loading = signal(false);
  
  async onResendVerification() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    
    try {
      await this.authService.resendVerificationEmail();
      this.success.set('Email de vérification envoyé avec succès');
    } catch (error: any) {
      this.error.set(error);
    } finally {
      this.loading.set(false);
    }
  }
  
  async onLogout() {
    await this.authService.logout();
  }
}
