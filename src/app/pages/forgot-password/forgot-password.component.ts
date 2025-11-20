
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  
  email = signal('');
  error = signal('');
  success = signal('');
  loading = signal(false);
  
  async onResetPassword() {
    if (!this.email()) {
      this.error.set('Veuillez entrer votre email');
      return;
    }
    
    this.loading.set(true);
    this.error.set('');
    this.success.set('');
    
    try {
      await this.authService.resetPassword(this.email());
      this.success.set('Un email de réinitialisation a été envoyé à votre adresse');
      this.email.set('');
    } catch (error: any) {
      this.error.set(error);
    } finally {
      this.loading.set(false);
    }
  }
}
