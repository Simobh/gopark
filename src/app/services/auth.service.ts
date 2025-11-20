
import { Injectable, inject, signal } from '@angular/core';
import { 
  Auth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  user,
  type User
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
      this.router.navigate(['/home']);
      return credential;
    } catch (error: any) {
      throw this.handleError(error);
    }
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
      case 'auth/wrong-password':
        return 'Email ou mot de passe incorrect';
      case 'auth/popup-closed-by-user':
        return 'Connexion annulée';
      default:
        return 'Une erreur est survenue';
    }
  }
}
