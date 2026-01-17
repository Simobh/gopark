
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Auth, getMultiFactorResolver, MultiFactorResolver } from '@angular/fire/auth';


@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
private authService = inject(AuthService);
  private auth = inject(Auth); // <--- Injection nécessaire pour le resolver

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
      // On utilise la méthode commune pour gérer l'erreur (A2F ou autre)
      await this.handleLoginError(error);
    } finally {
      this.loading.set(false);
    }
  }

  // Petite aide pour avoir des messages plus propres
  private translateFirebaseError(code: string): string {
      switch (code) {
          case 'auth/invalid-credential':
          case 'auth/user-not-found':
          case 'auth/wrong-password':
              return 'Email ou mot de passe incorrect.';
          case 'auth/too-many-requests':
              return 'Trop de tentatives. Veuillez réessayer plus tard.';
          default:
              return '';
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
    let container = document.getElementById('recaptcha-container');

    if (!container) {
      // On cherche l'endroit où l'insérer
      // J'ai ajouté une div conditionnelle dans le HTML pour l'étape 'sending'
      // Mais si jamais le DOM n'est pas prêt, on le force ici :

      container = document.createElement('div');
      container.id = 'recaptcha-container';

      // Style inline pour éviter les sauts de page
      container.style.display = 'flex';
      container.style.justifyContent = 'center';
      container.style.margin = '1rem 0';

      // On essaye de le mettre dans le formulaire MFA
      const mfaForm = document.querySelector('.mfa-login');
      if (mfaForm) {
         // On l'insère avant le bouton de validation s'il existe, sinon à la fin
         mfaForm.appendChild(container);
      }
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
    this.mfaRequired.set(false);

    try {
      await this.authService.loginWithGoogle();
    } catch (error: any) {
      // On utilise la MÊME méthode pour gérer l'erreur Google
      await this.handleLoginError(error);
    } finally {
      this.loading.set(false);
    }
  }

  private async handleLoginError(error: any) {
    console.log("Erreur Login:", error);

    // Détection A2F
    if (error.code === 'auth/multi-factor-auth-required') {
        let resolver = undefined;
        try {
           resolver = getMultiFactorResolver(this.auth, error);
        } catch (e) {
           console.warn("getMultiFactorResolver failed, fallback manual.");
        }

        if (!resolver) {
           resolver = (error as any).resolver ||
                      ((error as any).customData && (error as any).customData.resolver);
        }

        if (resolver) {
            this.mfaResolver.set(resolver);
            this.mfaRequired.set(true);

            const hints = resolver.hints;
            if (hints && hints.length > 0 && (hints[0] as any).phoneNumber) {
               this.mfaPhoneNumber.set((hints[0] as any).phoneNumber);
            }
            // Arrêt ici, on attend que l'utilisateur gère l'A2F
            return;
        } else {
            console.error("Resolver A2F introuvable");
        }
    }

    // Affichage des erreurs standards
    const msg = this.translateFirebaseError(error.code) || error.message || 'Une erreur est survenue.';
    this.error.set(msg);
  }
}
