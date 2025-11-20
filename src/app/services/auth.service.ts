
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
  type User,
  type MultiFactorResolver
} from '@angular/fire/auth';
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
      
      // Envoyer l'email de vérification
      if (credential.user) {
        await sendEmailVerification(credential.user);
      }
      
      this.router.navigate(['/home']);
      return credential;
    } catch (error: any) {
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
      if (currentUser && !currentUser.emailVerified) {
        await sendEmailVerification(currentUser);
      }
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
  
  isEmailVerified(): boolean {
    return this.auth.currentUser?.emailVerified ?? false;
  }
  
  async enrollMFA(phoneNumber: string, verificationId: string, verificationCode: string) {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) throw new Error('Utilisateur non connecté');
      
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      await multiFactor(currentUser).enroll(multiFactorAssertion, 'Phone number');
    } catch (error: any) {
      throw this.handleError(error);
    }
  }
  
  hasMFA(): boolean {
    const currentUser = this.auth.currentUser;
    return currentUser ? multiFactor(currentUser).enrolledFactors.length > 0 : false;
  }
  
  async loginWithEmail(email: string, password: string) {
    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      this.router.navigate(['/home']);
      return credential;
    } catch (error: any) {
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
    switch (error.code) {
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
      default:
        return error.message || 'Une erreur est survenue';
    }
  }
}
