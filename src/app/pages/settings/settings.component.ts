
import { Component, inject, signal, effect } from '@angular/core';
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
  
  // État pour l'A2F
  mfaPhoneNumber = signal('');
  mfaVerificationCode = signal('');
  mfaVerificationId = signal('');
  mfaStep = signal<'idle' | 'sending' | 'verifying' | 'needs-reauth'>('idle');
  mfaLoading = signal(false);
  mfaPassword = signal(''); // Pour la reauthentification
  
  constructor() {
    // Effet pour nettoyer reCAPTCHA quand on quitte le composant
    effect(() => {
      if (this.mfaStep() === 'idle') {
        this.cleanupRecaptcha();
      }
    });
  }
  
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
  
  async onSendMFAVerificationCode() {
    const phoneNumber = this.mfaPhoneNumber().trim();
    
    if (!phoneNumber) {
      this.error.set('Veuillez entrer un numéro de téléphone');
      return;
    }
    
    // Valider le format du numéro (format international)
    if (!phoneNumber.startsWith('+')) {
      this.error.set('Le numéro doit être au format international (ex: +33612345678)');
      return;
    }
    
    this.mfaLoading.set(true);
    this.error.set('');
    this.success.set('');
    this.mfaStep.set('sending');
    
    try {
      // S'assurer que le conteneur reCAPTCHA existe et attendre que le DOM soit mis à jour
      this.ensureRecaptchaContainer();
      
      // Attendre que Angular ait mis à jour le DOM
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Vérifier à nouveau que le conteneur existe
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error('Le conteneur reCAPTCHA n\'a pas pu être créé. Veuillez rafraîchir la page.');
      }
      
      const verificationId = await this.authService.sendMFAVerificationCode(phoneNumber);
      this.mfaVerificationId.set(verificationId);
      this.mfaStep.set('verifying');
      this.success.set('Code SMS envoyé ! Vérifiez votre téléphone et entrez le code reçu.');
    } catch (error: any) {
      // Vérifier si c'est l'erreur requires-recent-login
      if (error && (error.code === 'auth/requires-recent-login' || (typeof error === 'string' && error.includes('reconnexion récente')))) {
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
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const container = document.getElementById('recaptcha-container');
      if (!container) {
        throw new Error('Le conteneur reCAPTCHA n\'a pas pu être créé. Veuillez rafraîchir la page.');
      }
      
      // Passer le mot de passe pour la reauthentification
      const verificationId = await this.authService.sendMFAVerificationCode(phoneNumber, 'recaptcha-container', password);
      this.mfaVerificationId.set(verificationId);
      this.mfaStep.set('verifying');
      this.mfaPassword.set(''); // Nettoyer le mot de passe
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
    if (!confirm('Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ? Votre compte sera moins sécurisé.')) {
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
    // Le conteneur devrait déjà être dans le HTML, on vérifie juste qu'il existe
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      // Si le conteneur n'existe pas (cas de fallback), on le crée
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
      // S'assurer que le conteneur est visible et configuré
      container.style.minHeight = '78px';
      container.style.margin = '20px 0';
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
    }
  }
  
  private cleanupRecaptcha() {
    const container = document.getElementById('recaptcha-container');
    if (container) {
      // Réinitialiser reCAPTCHA avant de nettoyer le conteneur pour éviter SecurityError
      try {
        if ((window as any).grecaptcha && (window as any).grecaptcha.enterprise) {
          (window as any).grecaptcha.enterprise.reset();
        } else if ((window as any).grecaptcha && (window as any).grecaptcha.reset) {
          (window as any).grecaptcha.reset();
        }
      } catch (e) {
        console.warn('Impossible de réinitialiser reCAPTCHA:', e);
      }
      
      // Attendre un peu avant de nettoyer pour éviter les erreurs de frame
      setTimeout(() => {
        if (container) {
          container.innerHTML = '';
        }
      }, 100);
    }
  }
  
  async onLogout() {
    await this.authService.logout();
  }
}
