import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private authService = inject(AuthService);

  firstName = signal('');
  lastName = signal('');
  phoneNumber = signal('');
  email = signal('');
  password = signal('');
  confirmPassword = signal('');

  loading = signal(false);
  error = signal('');
  success = signal('');

  // 🔐 règles mot de passe
  hasMinLength = computed(() => this.password().length >= 8);
  hasUpper = computed(() => /[A-Z]/.test(this.password()));
  hasLower = computed(() => /[a-z]/.test(this.password()));
  hasNumber = computed(() => /[0-9]/.test(this.password()));
  hasSpecial = computed(() => /[^A-Za-z0-9]/.test(this.password()));

  passwordStrength = computed<'weak' | 'medium' | 'strong'>(() => {
    const score = [
      this.hasMinLength(),
      this.hasUpper(),
      this.hasLower(),
      this.hasNumber(),
      this.hasSpecial()
    ].filter(Boolean).length;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  });

  passwordsMatch = computed(() =>
    this.password() && this.confirmPassword()
      ? this.password() === this.confirmPassword()
      : true
  );

  canSubmit = computed(() =>
    this.firstName() &&
    this.lastName() &&
    this.email() &&
    this.password() &&
    this.confirmPassword() &&
    this.passwordsMatch() &&
    this.passwordStrength() === 'strong' &&
    !this.loading()
  );

  async onRegister() {
    if (!this.canSubmit()) return;

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      await this.authService.registerWithEmail(
        this.email(),
        this.password(),
        {
          firstName: this.firstName(),
          lastName: this.lastName(),
          phoneNumber: this.phoneNumber()
        }
      );

      this.success.set(
        `Inscription réussie ! Un email de vérification a été envoyé à ${this.email()}`
      );
    } catch (e: any) {
      this.error.set(e.message ?? e);
    } finally {
      this.loading.set(false);
    }
  }

  async onGoogleRegister() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.authService.loginWithGoogle();
    } catch (e: any) {
      this.error.set(e);
    } finally {
      this.loading.set(false);
    }
  }
}
