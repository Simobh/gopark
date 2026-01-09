import { Component, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Location } from '@angular/common';

const LS_AVATAR_KEY = 'gopark_avatar_preview';
const LS_FIRSTNAME_KEY = 'gopark_first_name';
const LS_LASTNAME_KEY = 'gopark_last_name';

@Component({
  selector: 'app-settings',
  imports: [FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  authService = inject(AuthService);
  private location = inject(Location);

  error = signal('');
  success = signal('');
  loading = signal(false);

  // UI
  activeTab = signal<'profile' | 'password' | 'verification' | 'delete'>('profile');
  editMode = signal(false);

  // Avatar + infos user
  avatarPreviewUrl = signal<string>('');
  firstName = signal<string>('');
  lastName = signal<string>('');

  // ✅ MOT DE PASSE
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  passwordLoading = signal(false);

  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  // MFA
  mfaPhoneNumber = signal('');
  mfaVerificationCode = signal('');
  mfaVerificationId = signal('');
  mfaStep = signal<'idle' | 'sending' | 'verifying' | 'needs-reauth'>('idle');
  mfaLoading = signal(false);
  mfaPassword = signal('');

  constructor() {
    const savedAvatar = localStorage.getItem(LS_AVATAR_KEY);
    if (savedAvatar) this.avatarPreviewUrl.set(savedAvatar);

    const savedFirst = localStorage.getItem(LS_FIRSTNAME_KEY);
    const savedLast = localStorage.getItem(LS_LASTNAME_KEY);
    if (savedFirst) this.firstName.set(savedFirst);
    if (savedLast) this.lastName.set(savedLast);

    effect(() => {
      const user = this.authService.currentUser?.();
      if (!user) return;

      if (this.firstName() || this.lastName()) return;

      const dn = (user as any)?.displayName as string | undefined;
      if (!dn) return;

      const parts = dn.trim().split(/\s+/);
      const first = parts[0] || '';
      const last = parts.slice(1).join(' ') || '';

      this.firstName.set(first);
      this.lastName.set(last);

      localStorage.setItem(LS_FIRSTNAME_KEY, first);
      localStorage.setItem(LS_LASTNAME_KEY, last);
    });

    effect(() => {
      if (this.mfaStep() === 'idle') {
        this.cleanupRecaptcha();
      }
    });
  }

  // =========================
  // ✅ MOT DE PASSE
  // =========================

  passwordStrength(): '' | 'Faible' | 'Moyen' | 'Fort' {
  const p = this.newPassword().trim();

  // ✅ Tant que l’utilisateur n’a rien tapé → RIEN
  if (!p) return '';

  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNumber = /[0-9]/.test(p);
  const hasSpecial = /[^A-Za-z0-9]/.test(p);
  const longEnough = p.length >= 8;

  const score = [hasUpper, hasLower, hasNumber, hasSpecial, longEnough].filter(Boolean).length;

  if (score <= 2) return 'Faible';
  if (score <= 4) return 'Moyen';
  return 'Fort';
}

  canSubmitPasswordForm() {
    const cur = this.currentPassword().trim();
    const n = this.newPassword().trim();
    const c = this.confirmPassword().trim();

    if (!cur || !n || !c) return false;
    if (n.length < 8) return false;
    if (n !== c) return false;

    return true;
  }

  resetPasswordForm() {
    this.currentPassword.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.showCurrentPassword.set(false);
    this.showNewPassword.set(false);
    this.showConfirmPassword.set(false);
  }

  async onChangePassword() {
    this.error.set('');
    this.success.set('');

    if (!this.canSubmitPasswordForm()) {
      this.error.set('Veuillez vérifier les champs du formulaire.');
      return;
    }

    this.passwordLoading.set(true);

    try {
      await this.authService.changePassword(
        this.currentPassword().trim(),
        this.newPassword().trim()
      );

      this.success.set('Mot de passe mis à jour avec succès.');
      this.resetPasswordForm();
    } catch (e: any) {
      this.error.set(e?.message || String(e) || 'Erreur lors de la mise à jour du mot de passe.');
    } finally {
      this.passwordLoading.set(false);
    }
  }

  // =========================
  // ✅ EMAIL VERIFICATION
  // =========================

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

  // =========================
  // ✅ MFA
  // =========================

  async onSendMFAVerificationCode() {
    const phoneNumber = this.mfaPhoneNumber().trim();

    if (!phoneNumber) {
      this.error.set('Veuillez entrer un numéro de téléphone');
      return;
    }
    if (!phoneNumber.startsWith('+')) {
      this.error.set('Le numéro doit être au format international (ex: +33612345678)');
      return;
    }

    this.mfaLoading.set(true);
    this.error.set('');
    this.success.set('');
    this.mfaStep.set('sending');

    try {
      this.ensureRecaptchaContainer();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error("Le conteneur reCAPTCHA n'a pas pu être créé. Veuillez rafraîchir la page.");
      }

      const verificationId = await this.authService.sendMFAVerificationCode(phoneNumber);
      this.mfaVerificationId.set(verificationId);
      this.mfaStep.set('verifying');
      this.success.set('Code SMS envoyé ! Vérifiez votre téléphone et entrez le code reçu.');
    } catch (error: any) {
      if (
        error &&
        (error.code === 'auth/requires-recent-login' ||
          (typeof error === 'string' && error.includes('reconnexion récente')))
      ) {
        this.mfaStep.set('needs-reauth');
        this.error.set('Une reconnexion récente est requise. Veuillez entrer votre mot de passe pour continuer.');
      } else {
        this.error.set(error);
        this.mfaStep.set('idle');
        this.cleanupRecaptcha();
      }
    } finally {
      this.mfaLoading.set(false);
    }
  }

  async onReauthenticateAndSendCode() {
    const phoneNumber = this.mfaPhoneNumber().trim();
    const password = this.mfaPassword().trim();

    if (!password) {
      this.error.set('Veuillez entrer votre mot de passe');
      return;
    }

    this.mfaLoading.set(true);
    this.error.set('');
    this.success.set('');
    this.mfaStep.set('sending');

    try {
      this.ensureRecaptchaContainer();
      await new Promise((resolve) => setTimeout(resolve, 300));

      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error("Le conteneur reCAPTCHA n'a pas pu être créé. Veuillez rafraîchir la page.");
      }

      const verificationId = await this.authService.sendMFAVerificationCode(
        phoneNumber,
        'recaptcha-container',
        password
      );

      this.mfaVerificationId.set(verificationId);
      this.mfaStep.set('verifying');
      this.mfaPassword.set('');
      this.success.set('Code SMS envoyé ! Vérifiez votre téléphone et entrez le code reçu.');
    } catch (error: any) {
      this.error.set(error);
      if (error && error.code !== 'auth/requires-recent-login') {
        this.mfaStep.set('idle');
        this.cleanupRecaptcha();
      }
    } finally {
      this.mfaLoading.set(false);
    }
  }

  async onVerifyMFA() {
    const code = this.mfaVerificationCode().trim();
    const phoneNumber = this.mfaPhoneNumber().trim();
    const verificationId = this.mfaVerificationId();

    if (!code) {
      this.error.set('Veuillez entrer le code de vérification');
      return;
    }

    if (!verificationId) {
      this.error.set('Erreur: ID de vérification manquant. Veuillez recommencer.');
      return;
    }

    this.mfaLoading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      await this.authService.enrollMFA(phoneNumber, verificationId, code);
      this.success.set('A2F activé avec succès ! Votre compte est maintenant plus sécurisé.');
      this.resetMFAForm();
    } catch (error: any) {
      this.error.set(error);
    } finally {
      this.mfaLoading.set(false);
    }
  }

  async onDisableMFA() {
    if (!confirm("Êtes-vous sûr de vouloir désactiver l'authentification à deux facteurs ?")) {
      return;
    }

    this.mfaLoading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      await this.authService.unenrollMFA();
      this.success.set('A2F désactivé avec succès');
    } catch (error: any) {
      this.error.set(error);
    } finally {
      this.mfaLoading.set(false);
    }
  }

  onCancelMFA() {
    this.resetMFAForm();
    this.cleanupRecaptcha();
  }

  private resetMFAForm() {
    this.mfaPhoneNumber.set('');
    this.mfaVerificationCode.set('');
    this.mfaVerificationId.set('');
    this.mfaPassword.set('');
    this.mfaStep.set('idle');
  }

  private ensureRecaptchaContainer() {
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      container.style.minHeight = '78px';
      container.style.margin = '20px 0';
      container.style.display = 'flex';
      container.style.justifyContent = 'center';

      const mfaSection = document.querySelector('.mfa-setup') || document.querySelector('.mfa-form');
      if (mfaSection) {
        mfaSection.appendChild(container);
      }
    } else {
      container.style.minHeight = '78px';
      container.style.margin = '20px 0';
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
    }
  }

  private cleanupRecaptcha() {
    const container = document.getElementById('recaptcha-container');
    if (container) {
      try {
        if ((window as any).grecaptcha && (window as any).grecaptcha.enterprise) {
          (window as any).grecaptcha.enterprise.reset();
        } else if ((window as any).grecaptcha && (window as any).grecaptcha.reset) {
          (window as any).grecaptcha.reset();
        }
      } catch (e) {
        console.warn('Impossible de réinitialiser reCAPTCHA:', e);
      }
      setTimeout(() => {
        if (container) container.innerHTML = '';
      }, 100);
    }
  }

  async onLogout() {
    await this.authService.logout();
  }

  onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.error.set('Veuillez sélectionner une image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;

      this.avatarPreviewUrl.set(dataUrl);
      localStorage.setItem(LS_AVATAR_KEY, dataUrl);

      this.success.set('Photo enregistrée.');
      this.error.set('');
    };
    reader.readAsDataURL(file);

    input.value = '';
  }

  passwordScore(): number {
    const p = this.newPassword();
    let score = 0;

    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[a-z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;

    return score; // 0 → 5
  }

  passwordProgress(): number {
    return (this.passwordScore() / 5) * 100;
  }

    goBack() {
      this.location.back();
    }
}
