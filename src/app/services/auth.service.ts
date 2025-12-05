
import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  user,
  sendEmailVerification,
  sendPasswordResetEmail,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
  type MultiFactorResolver
} from '@angular/fire/auth';
import { RecaptchaVerifier, getAuth } from 'firebase/auth';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth = inject(Auth);
  private router = inject(Router);

  currentUser = signal<User | null>(null);

  constructor() {
    user(this.auth).subscribe(currentUser => {
      this.currentUser.set(currentUser);
    });
  }

  async registerWithEmail(email: string, password: string) {
    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      // Envoyer l'email de vérification avec action code settings
      if (credential.user) {
        try {
          // Obtenir l'URL de base de l'application
          const actionCodeSettings = {
            url: window.location.origin + '/home',
            handleCodeInApp: false,
          };

          await sendEmailVerification(credential.user, actionCodeSettings);
          console.log('Email de vérification envoyé avec succès');
        } catch (emailError: any) {
          console.error('Erreur lors de l\'envoi de l\'email de vérification:', emailError);
          // Ne pas bloquer l'inscription si l'email échoue, mais logger l'erreur
          throw new Error('Erreur lors de l\'envoi de l\'email de vérification: ' + this.handleError(emailError));
        }
      }

      this.router.navigate(['/home']);
      return credential;
    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      throw this.handleError(error);
    }
  }

  async resetPassword(email: string) {
    try {
      await sendPasswordResetEmail(this.auth, email);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async resendVerificationEmail() {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      if (currentUser.emailVerified) {
        throw new Error('L\'email est déjà vérifié');
      }

      // Configurer les paramètres d'action code pour l'email
      const actionCodeSettings = {
        url: window.location.origin + '/home',
        handleCodeInApp: false,
      };

      await sendEmailVerification(currentUser, actionCodeSettings);
      console.log('Email de vérification renvoyé avec succès');
    } catch (error: any) {
      console.error('Erreur lors du renvoi de l\'email de vérification:', error);
      throw this.handleError(error);
    }
  }

  isEmailVerified(): boolean {
    return this.auth.currentUser?.emailVerified ?? false;
  }

  /**
   * Vérifie si l'utilisateur doit se reconnecter récemment
   * @param password Mot de passe de l'utilisateur (optionnel, pour reauthentification)
   */
  async ensureRecentLogin(password?: string): Promise<void> {
    const currentUser = this.auth.currentUser;
    if (!currentUser || !currentUser.email) {
      throw new Error('Aucun utilisateur connecté');
    }

    // Vérifier le temps depuis la dernière authentification (5 minutes)
    const lastSignInTime = currentUser.metadata.lastSignInTime;
    if (lastSignInTime) {
      const lastSignIn = new Date(lastSignInTime).getTime();
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;

      // Si la dernière connexion est récente (moins de 5 minutes), pas besoin de reauthentification
      if (now - lastSignIn < fiveMinutes) {
        return;
      }
    }

    // Si un mot de passe est fourni, faire une reauthentification
    if (password && currentUser.email) {
      try {
        const credential = EmailAuthProvider.credential(currentUser.email, password);
        await reauthenticateWithCredential(currentUser, credential);
        return;
      } catch (error: any) {
        if (error.code === 'auth/requires-recent-login' || error.code === 'auth/wrong-password') {
          throw {
            code: 'auth/requires-recent-login',
            message: 'Mot de passe incorrect ou reconnexion requise. Veuillez vérifier votre mot de passe.'
          };
        }
        throw error;
      }
    }

    // Si pas de mot de passe, lancer l'erreur
    throw {
      code: 'auth/requires-recent-login',
      message: 'Une reconnexion récente est requise pour activer l\'A2F. Veuillez vous déconnecter et vous reconnecter, puis réessayer.'
    };
  }

  async sendMFAVerificationCode(phoneNumber: string, recaptchaContainerId: string = 'recaptcha-container', password?: string): Promise<string> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Vérifier que l'email est vérifié (requis pour A2F)
      if (!currentUser.emailVerified) {
        throw new Error('Veuillez d\'abord vérifier votre email avant d\'activer l\'A2F');
      }

      // Vérifier si une reconnexion récente est nécessaire
      try {
        await this.ensureRecentLogin(password);
      } catch (error: any) {
        // Si c'est l'erreur requires-recent-login, la propager
        if (error.code === 'auth/requires-recent-login') {
          throw error;
        }
        // Sinon, continuer (peut-être que la dernière connexion est récente)
      }

      // Vérifier que le conteneur existe
      const container = document.getElementById(recaptchaContainerId);
      if (!container) {
        throw new Error('Le conteneur reCAPTCHA n\'existe pas. Veuillez réessayer.');
      }

      // Nettoyer le conteneur avant de créer un nouveau verifier
      container.innerHTML = '';

      // Attendre un peu pour s'assurer que le DOM est prêt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Obtenir l'instance Auth native de Firebase
      const nativeAuth = getAuth();

      // Créer le verifier reCAPTCHA avec l'instance native
      // Configuration améliorée pour éviter les erreurs d'intégration
      const recaptchaVerifier = new RecaptchaVerifier(nativeAuth, recaptchaContainerId, {
        size: 'normal',
        callback: () => {
          console.log('reCAPTCHA résolu');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expiré');
          // Réinitialiser le widget si expiré
          try {
            if ((window as any).grecaptcha && (window as any).grecaptcha.enterprise) {
              (window as any).grecaptcha.enterprise.reset();
            }
          } catch (e) {
            console.warn('Impossible de réinitialiser reCAPTCHA:', e);
          }
        }
      });

      // Rendre le verifier visible avec gestion d'erreurs améliorée
      try {
        await recaptchaVerifier.render();
      } catch (renderError: any) {
        console.error('Erreur lors du rendu de reCAPTCHA:', renderError);

        // Vérifier le type d'erreur
        const errorMessage = String(renderError.message || '').toLowerCase();
        const errorCode = renderError.code || '';

        // Erreur de domaine localhost
        if (errorMessage.includes('localhost') || errorMessage.includes('domain') || errorMessage.includes('domaine') || errorMessage.includes('not in the list')) {
          throw {
            code: 'auth/invalid-app-credential',
            message: 'Le domaine localhost n\'est pas autorisé pour reCAPTCHA. Allez dans Google Cloud Console → reCAPTCHA Enterprise → Votre clé de site → Domaines autorisés → Ajoutez "localhost" et "127.0.0.1".'
          };
        }

        // Erreur SecurityError (cross-origin)
        if (errorMessage.includes('securityerror') || errorMessage.includes('blocked a frame') || errorMessage.includes('cross-origin')) {
          throw {
            code: 'auth/internal-error',
            message: 'Erreur SecurityError reCAPTCHA. Le widget a été supprimé prématurément. Veuillez rafraîchir la page et réessayer.'
          };
        }

        // Erreur BROWSER_ERROR
        if (errorMessage.includes('browser_error') || errorCode === 'auth/internal-error') {
          throw {
            code: 'auth/internal-error',
            message: 'Erreur réseau reCAPTCHA (BROWSER_ERROR). Vérifiez votre connexion internet et réessayez. Si le problème persiste, rafraîchissez la page.'
          };
        }

        // Erreur de configuration
        if (errorCode === 'auth/invalid-app-credential' || errorCode === 'auth/internal-error') {
          throw {
            code: errorCode || 'auth/internal-error',
            message: 'Erreur de configuration reCAPTCHA Enterprise. Vérifiez : 1) reCAPTCHA SMS defense activé, 2) Clés de site Web configurées, 3) localhost ajouté aux domaines autorisés dans Google Cloud Console.'
          };
        }

        throw new Error('Impossible d\'afficher reCAPTCHA. Vérifiez votre connexion internet et la configuration Firebase.');
      }

      // Obtenir la session MFA
      const session = await multiFactor(currentUser).getSession();

      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: session
      };

      // Import dynamique de firebase/auth pour accéder à verifyPhoneNumber
      const firebaseAuth = await import('firebase/auth');

      try {
        // Essayer avec l'API PhoneAuthProvider
        const phoneAuthProvider = new firebaseAuth.PhoneAuthProvider(nativeAuth);
        if (typeof (phoneAuthProvider as any).verifyPhoneNumber === 'function') {
          const verificationId = await (phoneAuthProvider as any).verifyPhoneNumber(
            phoneInfoOptions,
            recaptchaVerifier
          );
          return verificationId;
        }
      } catch (e) {
        console.warn('Méthode verifyPhoneNumber non disponible sur PhoneAuthProvider, tentative alternative...', e);
      }

      // Fallback: utiliser directement depuis firebase/auth si disponible
      if (typeof (firebaseAuth as any).verifyPhoneNumber === 'function') {
        return await (firebaseAuth as any).verifyPhoneNumber(nativeAuth, phoneInfoOptions, recaptchaVerifier);
      }

      // Si aucune méthode ne fonctionne, lancer une erreur explicite
      throw {
        code: 'auth/operation-not-allowed',
        message: 'L\'authentification SMS/MFA n\'est pas activée. Vérifiez : 1) Authentication → Méthode de connexion → "Téléphone" activé, 2) Authentication → Paramètres → reCAPTCHA → "reCAPTCHA SMS defense" activé, 3) Authentication → Paramètres → SMS → Règles pour les SMS par région → Région activée pour votre pays.'
      };
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du code SMS:', error);
      // Nettoyer le conteneur en cas d'erreur
      const container = document.getElementById(recaptchaContainerId);
      if (container) {
        container.innerHTML = '';
      }
      throw this.handleError(error);
    }
  }

  async enrollMFA(phoneNumber: string, verificationId: string, verificationCode: string) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Créer les credentials avec le code de vérification
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

      // Enregistrer le facteur MFA
      await multiFactor(currentUser).enroll(multiFactorAssertion, phoneNumber);
      console.log('A2F activé avec succès');
    } catch (error: any) {
      console.error('Erreur lors de l\'activation de l\'A2F:', error);
      throw this.handleError(error);
    }
  }

  async unenrollMFA(uid?: string) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      const enrolledFactors = multiFactor(currentUser).enrolledFactors;

      if (enrolledFactors.length === 0) {
        throw new Error('Aucun facteur A2F à désactiver');
      }

      // Si un UID est fourni, supprimer ce facteur spécifique, sinon le premier
      const factorToRemove = uid
        ? enrolledFactors.find(f => f.uid === uid)
        : enrolledFactors[0];

      if (!factorToRemove) {
        throw new Error('Facteur A2F non trouvé');
      }

      await multiFactor(currentUser).unenroll(factorToRemove);
      console.log('A2F désactivé avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la désactivation de l\'A2F:', error);
      throw this.handleError(error);
    }
  }

  hasMFA(): boolean {
    const currentUser = this.auth.currentUser;
    return currentUser ? multiFactor(currentUser).enrolledFactors.length > 0 : false;
  }

  getMFAFactors(): Array<{ uid: string; displayName: string; enrollmentTime: string; phoneNumber?: string }> {
    const currentUser = this.auth.currentUser;
    if (!currentUser) {
      return [];
    }

    return multiFactor(currentUser).enrolledFactors.map(factor => {
      // MultiFactorInfo n'a pas directement phoneNumber, on utilise displayName
      const factorInfo = factor as any;
      return {
        uid: factor.uid,
        displayName: factor.displayName || 'Téléphone',
        enrollmentTime: factorInfo.enrollmentTime || '',
        phoneNumber: factorInfo.phoneNumber || undefined
      };
    });
  }

  async loginWithEmail(email: string, password: string) {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/home']);
      return credential;
    } catch (error: any) {
      // Vérifier si l'erreur indique qu'un MFA est requis
      if (error.code === 'auth/multi-factor-auth-required') {
        // L'erreur contient un resolver MFA
        throw {
          code: 'auth/multi-factor-auth-required',
          resolver: error.resolver,
          message: 'Authentification à deux facteurs requise'
        };
      }
      throw this.handleError(error);
    }
  }

  async resolveMFA(resolver: MultiFactorResolver, verificationId: string, verificationCode: string) {
    try {
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);

      await resolver.resolveSignIn(multiFactorAssertion);
      this.router.navigate(['/home']);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async sendMFALoginCode(resolver: MultiFactorResolver, phoneNumber: string, recaptchaContainerId: string = 'recaptcha-container'): Promise<string> {
    try {
      // Vérifier que le conteneur existe
      const container = document.getElementById(recaptchaContainerId);
      if (!container) {
        throw new Error('Le conteneur reCAPTCHA n\'existe pas. Veuillez réessayer.');
      }

      // Nettoyer le conteneur avant de créer un nouveau verifier
      container.innerHTML = '';

      // Attendre un peu pour s'assurer que le DOM est prêt
      await new Promise(resolve => setTimeout(resolve, 100));

      // Obtenir l'instance Auth native de Firebase
      const nativeAuth = getAuth();

      // Créer le verifier reCAPTCHA avec l'instance native
      // Configuration améliorée pour éviter les erreurs d'intégration
      const recaptchaVerifier = new RecaptchaVerifier(nativeAuth, recaptchaContainerId, {
        size: 'normal',
        callback: () => {
          console.log('reCAPTCHA résolu');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expiré');
          // Réinitialiser le widget si expiré
          try {
            if ((window as any).grecaptcha && (window as any).grecaptcha.enterprise) {
              (window as any).grecaptcha.enterprise.reset();
            }
          } catch (e) {
            console.warn('Impossible de réinitialiser reCAPTCHA:', e);
          }
        }
      });

      // Rendre le verifier visible avec gestion d'erreurs améliorée
      try {
        await recaptchaVerifier.render();
      } catch (renderError: any) {
        console.error('Erreur lors du rendu de reCAPTCHA:', renderError);

        // Vérifier le type d'erreur
        const errorMessage = String(renderError.message || '').toLowerCase();
        const errorCode = renderError.code || '';

        // Erreur de domaine localhost
        if (errorMessage.includes('localhost') || errorMessage.includes('domain') || errorMessage.includes('domaine') || errorMessage.includes('not in the list')) {
          throw {
            code: 'auth/invalid-app-credential',
            message: 'Le domaine localhost n\'est pas autorisé pour reCAPTCHA. Allez dans Google Cloud Console → reCAPTCHA Enterprise → Votre clé de site → Domaines autorisés → Ajoutez "localhost" et "127.0.0.1".'
          };
        }

        // Erreur SecurityError (cross-origin)
        if (errorMessage.includes('securityerror') || errorMessage.includes('blocked a frame') || errorMessage.includes('cross-origin')) {
          throw {
            code: 'auth/internal-error',
            message: 'Erreur SecurityError reCAPTCHA. Le widget a été supprimé prématurément. Veuillez rafraîchir la page et réessayer.'
          };
        }

        // Erreur BROWSER_ERROR
        if (errorMessage.includes('browser_error') || errorCode === 'auth/internal-error') {
          throw {
            code: 'auth/internal-error',
            message: 'Erreur réseau reCAPTCHA (BROWSER_ERROR). Vérifiez votre connexion internet et réessayez. Si le problème persiste, rafraîchissez la page.'
          };
        }

        // Erreur de configuration
        if (errorCode === 'auth/invalid-app-credential' || errorCode === 'auth/internal-error') {
          throw {
            code: errorCode || 'auth/internal-error',
            message: 'Erreur de configuration reCAPTCHA Enterprise. Vérifiez : 1) reCAPTCHA SMS defense activé, 2) Clés de site Web configurées, 3) localhost ajouté aux domaines autorisés dans Google Cloud Console.'
          };
        }

        throw new Error('Impossible d\'afficher reCAPTCHA. Vérifiez votre connexion internet et la configuration Firebase.');
      }

      const session = resolver.session;
      const phoneInfoOptions = {
        phoneNumber: phoneNumber,
        session: session
      };

      // Import dynamique de firebase/auth pour accéder à verifyPhoneNumber
      const firebaseAuth = await import('firebase/auth');

      // Essayer avec l'API PhoneAuthProvider
      try {
        const phoneAuthProvider = new firebaseAuth.PhoneAuthProvider(nativeAuth);
        if (typeof (phoneAuthProvider as any).verifyPhoneNumber === 'function') {
          const verificationId = await (phoneAuthProvider as any).verifyPhoneNumber(
            phoneInfoOptions,
            recaptchaVerifier
          );
          return verificationId;
        }
      } catch (e) {
        console.warn('Méthode verifyPhoneNumber non disponible, tentative alternative...', e);
      }

      // Fallback: utiliser directement depuis firebase/auth si disponible
      if (typeof (firebaseAuth as any).verifyPhoneNumber === 'function') {
        return await (firebaseAuth as any).verifyPhoneNumber(nativeAuth, phoneInfoOptions, recaptchaVerifier);
      }

      throw {
        code: 'auth/operation-not-allowed',
        message: 'L\'authentification SMS/MFA n\'est pas activée. Vérifiez : 1) Authentication → Méthode de connexion → "Téléphone" activé, 2) Authentication → Paramètres → reCAPTCHA → "reCAPTCHA SMS defense" activé, 3) Authentication → Paramètres → SMS → Règles pour les SMS par région → Région activée pour votre pays.'
      };
    } catch (error: any) {
      console.error('Erreur lors de l\'envoi du code SMS pour la connexion:', error);
      // Nettoyer le conteneur en cas d'erreur
      const container = document.getElementById(recaptchaContainerId);
      if (container) {
        container.innerHTML = '';
      }
      throw this.handleError(error);
    }
  }

  async loginWithGoogle() {
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(this.auth, provider);
      this.router.navigate(['/home']);
      return credential;
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  async logout() {
    try {
      await signOut(this.auth);
      this.router.navigate(['/login']);
    } catch (error: any) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): string {
    // Si c'est déjà une string, la retourner
    if (typeof error === 'string') {
      return error;
    }

    // Si c'est une Error, utiliser son message
    if (error instanceof Error && !(error as any).code) {
      return error.message;
    }

    const errorCode = (error as any).code;
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Cet email est déjà utilisé';
      case 'auth/invalid-email':
        return 'Email invalide';
      case 'auth/weak-password':
        return 'Le mot de passe doit contenir au moins 6 caractères';
      case 'auth/user-not-found':
        return 'Utilisateur non trouvé';
      case 'auth/wrong-password':
        return 'Mot de passe incorrect';
      case 'auth/popup-closed-by-user':
        return 'Connexion annulée';
      case 'auth/too-many-requests':
        return 'Trop de tentatives. Veuillez réessayer plus tard';
      case 'auth/network-request-failed':
        return 'Erreur réseau. Vérifiez votre connexion';
      case 'auth/missing-continue-uri':
        return 'URL de redirection manquante pour l\'email de vérification';
      case 'auth/invalid-continue-uri':
        return 'URL de redirection invalide pour l\'email de vérification';
      case 'auth/unauthorized-continue-uri':
        return 'URL de redirection non autorisée. Vérifiez la configuration Firebase';
      case 'auth/invalid-phone-number':
        return 'Numéro de téléphone invalide. Utilisez le format international (ex: +33612345678)';
      case 'auth/missing-phone-number':
        return 'Numéro de téléphone manquant';
      case 'auth/quota-exceeded':
        return 'Quota SMS dépassé. Réessayez plus tard';
      case 'auth/code-expired':
        return 'Le code de vérification a expiré. Demandez un nouveau code';
      case 'auth/invalid-verification-code':
        return 'Code de vérification invalide';
      case 'auth/invalid-verification-id':
        return 'ID de vérification invalide';
      case 'auth/missing-verification-code':
        return 'Code de vérification manquant';
      case 'auth/missing-verification-id':
        return 'ID de vérification manquant';
      case 'auth/session-expired':
        return 'Session expirée. Veuillez recommencer';
      case 'auth/multi-factor-auth-required':
        return 'Authentification à deux facteurs requise';
      case 'auth/captcha-check-failed':
        return 'Échec de la vérification reCAPTCHA. Veuillez réessayer.';
      case 'auth/invalid-app-credential':
        return 'Erreur de configuration reCAPTCHA Enterprise. Vérifiez que reCAPTCHA SMS defense est correctement configuré dans Firebase Console → Authentication → Paramètres → reCAPTCHA. Assurez-vous que les clés de site sont configurées pour la plateforme Web.';
      case 'auth/app-not-authorized':
        return 'Application non autorisée. Vérifiez la configuration Firebase.';
      case 'auth/internal-error':
        // Vérifier si c'est lié à reCAPTCHA
        const internalErrorMsg = String((error as any).message || '').toLowerCase();
        if (internalErrorMsg.includes('recaptcha') || internalErrorMsg.includes('captcha') || internalErrorMsg.includes('securityerror') || internalErrorMsg.includes('browser_error')) {
          if (internalErrorMsg.includes('localhost') || internalErrorMsg.includes('domain')) {
            return 'Le domaine localhost n\'est pas autorisé pour reCAPTCHA. Ajoutez "localhost" et "127.0.0.1" aux domaines autorisés dans Google Cloud Console → reCAPTCHA Enterprise → Votre clé de site.';
          }
          if (internalErrorMsg.includes('securityerror') || internalErrorMsg.includes('blocked a frame')) {
            return 'Erreur SecurityError reCAPTCHA. Le widget a été supprimé prématurément. Rafraîchissez la page et réessayez.';
          }
          if (internalErrorMsg.includes('browser_error')) {
            return 'Erreur réseau reCAPTCHA (BROWSER_ERROR). Vérifiez votre connexion internet et réessayez.';
          }
          return 'Erreur reCAPTCHA. Vérifiez que reCAPTCHA SMS defense est activé et correctement configuré dans Firebase Console.';
        }
        return 'Erreur interne. Veuillez réessayer ou contacter le support.';
      case 'auth/operation-not-allowed':
        // Vérifier si c'est une erreur de région SMS
        const errorMessage = (error as any).message || '';
        const errorString = String(errorMessage).toLowerCase();
        if (errorString.includes('region') || errorString.includes('région') || errorString.includes('sms unable to be sent') || errorString.includes('region enabled')) {
          return 'La région SMS pour votre numéro de téléphone n\'est pas activée. Allez dans Firebase Console → Authentication → Paramètres → SMS → Règles pour les SMS par région → Activez la région de votre numéro (ex: France pour +33).';
        }
        return 'L\'authentification SMS/MFA n\'est pas activée. Vérifiez : 1) Authentication → Méthode de connexion → "Téléphone" activé, 2) Authentication → Paramètres → reCAPTCHA → "reCAPTCHA SMS defense" activé, 3) Authentication → Paramètres → SMS → Règles pour les SMS par région → Région activée.';
      case 'auth/requires-recent-login':
        return 'Une reconnexion récente est requise pour activer l\'A2F. Veuillez vous déconnecter, vous reconnecter, puis réessayer d\'activer l\'A2F.';
      default:
        return (error as any).message || errorCode || 'Une erreur est survenue';
    }
  }
}
