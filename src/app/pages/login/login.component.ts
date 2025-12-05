
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import type { MultiFactorResolver } from '@angular/fire/auth';

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
  
  // État pour l'A2F lors de la connexion
  mfaRequired = signal(false);
  mfaResolver = signal<MultiFactorResolver | null>(null);
  mfaPhoneNumber = signal('');
  mfaVerificationCode = signal('');
  mfaVerificationId = signal('');
  mfaStep = signal<'idle' | 'sending' | 'verifying'>('idle');
  mfaLoading = signal(false);
  
  async onEmailLogin() {
    if (!this.email() || !this.password()) {
      this.error.set('Veuillez remplir tous les champs');
      return;
    }
    
    this.loading.set(true);
    this.error.set('');
    this.mfaRequired.set(false);
    
    try {
      await this.authService.loginWithEmail(this.email(), this.password());
    } catch (error: any) {
      // Vérifier si l'A2F est requis
      if (error.code === 'auth/multi-factor-auth-required' && error.resolver) {
        this.mfaRequired.set(true);
        this.mfaResolver.set(error.resolver);
        // Récupérer le numéro de téléphone enregistré si disponible
        try {
          const enrolledFactors = (error.resolver as any).hints;
          if (enrolledFactors && enrolledFactors.length > 0 && enrolledFactors[0].phoneNumber) {
            this.mfaPhoneNumber.set(enrolledFactors[0].phoneNumber);
          }
        } catch (e) {
          // Si les hints ne sont pas disponibles, on laisse l'utilisateur entrer le numéro
          console.log('Impossible de récupérer le numéro de téléphone depuis les hints');
        }
      } else {
        this.error.set(error);
      }
    } finally {
      this.loading.set(false);
    }
  }
  
  async onSendMFACode() {
    const resolver = this.mfaResolver();
    if (!resolver) {
      this.error.set('Erreur: resolver MFA manquant');
      return;
    }
    
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
      
      const verificationId = await this.authService.sendMFALoginCode(resolver, phoneNumber);
      this.mfaVerificationId.set(verificationId);
      this.mfaStep.set('verifying');
    } catch (error: any) {
      this.error.set(error);
      this.mfaStep.set('idle');
      this.cleanupRecaptcha();
    } finally {
      this.mfaLoading.set(false);
    }
  }
  
  async onVerifyMFACode() {
    const resolver = this.mfaResolver();
    const code = this.mfaVerificationCode().trim();
    const verificationId = this.mfaVerificationId();
    
    if (!resolver) {
      this.error.set('Erreur: resolver MFA manquant');
      return;
    }
    
    if (!code) {
      this.error.set('Veuillez entrer le code de vérification');
      return;
    }
    
    if (!verificationId) {
      this.error.set('Erreur: ID de vérification manquant');
      return;
    }
    
    this.mfaLoading.set(true);
    this.error.set('');
    
    try {
      await this.authService.resolveMFA(resolver, verificationId, code);
      this.resetMFAForm();
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
    this.mfaRequired.set(false);
    this.mfaResolver.set(null);
    this.mfaPhoneNumber.set('');
    this.mfaVerificationCode.set('');
    this.mfaVerificationId.set('');
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
      
      const mfaSection = document.querySelector('.mfa-login') || document.querySelector('.mfa-form');
      if (mfaSection) {
        mfaSection.appendChild(container);
      } else {
        const authCard = document.querySelector('.auth-card');
        if (authCard) {
          authCard.appendChild(container);
        }
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
