import { Component, inject, signal, effect, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Location } from '@angular/common';
import { Navbar } from '../../components/navbar/navbar';
import { Router } from '@angular/router';
import { Footer } from '../../components/footer/footer';

const LS_AVATAR_KEY = 'gopark_avatar_preview';
const LS_FIRSTNAME_KEY = 'gopark_first_name';
const LS_LASTNAME_KEY = 'gopark_last_name';

declare const bootstrap: any;

@Component({
  selector: 'app-settings',
  imports: [FormsModule, Navbar, Footer],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
})
export class SettingsComponent implements OnInit {

  private router = inject(Router);
  authService = inject(AuthService);
  private location = inject(Location);

  error = signal('');
  success = signal('');
  loading = signal(false);
  firstName = signal('');
  lastName = signal('');
  phoneNumber = signal('');
  deletePassword = signal('');
  deleteLoading = signal(false);


  // UI
  activeTab = signal<'profile' | 'password' | 'verification' | 'delete'>('profile');
  editMode = signal(false);

  // Avatar
  avatarPreviewUrl = signal<string | null>(null);
  avatarError = signal<string | null>(null);
  avatarSuccess = signal<string | null>(null);

  // MFA
  mfaPhoneNumber = signal('');
  mfaVerificationCode = signal('');
  mfaVerificationId = signal('');
  mfaStep = signal<'idle' | 'sending' | 'verifying' | 'needs-reauth'>('idle');
  mfaLoading = signal(false);
  mfaPassword = signal('');

  // Mot de passe
  currentPassword = signal('');
  newPassword = signal('');
  confirmPassword = signal('');
  passwordLoading = signal(false);

  showCurrentPassword = signal(false);
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);

  constructor() {
    // Effet pour initialiser first/last name si non définis
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

      if (typeof window !== 'undefined') {
        localStorage.setItem(LS_FIRSTNAME_KEY, first);
        localStorage.setItem(LS_LASTNAME_KEY, last);
      }
    });

    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.loadUserAvatar(user.uid);
      }
    });

    // Effet pour charger les données Firestore quand l'utilisateur est connecté
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this.authService.getUserDocument(user.uid).then((data: any) => {
          if (data) {
            if (data.phoneNumber) this.phoneNumber.set(data.phoneNumber);
            // On met à jour les noms seulement s'ils sont vides pour ne pas écraser les changements en cours
            if (data.firstName && !this.firstName()) this.firstName.set(data.firstName);
            if (data.lastName && !this.lastName()) this.lastName.set(data.lastName);
          }
        });
      }
    });

    // Effet pour nettoyage reCAPTCHA
    effect(() => {
      if (this.mfaStep() === 'idle') {
        this.cleanupRecaptcha();
      }
    });
  }

  ngOnInit() {
    this.activeTab.set('profile');

    const user = this.authService.currentUser();
    if (!user) return;

    // 1) afficher vite si on a déjà une URL
    const cached = localStorage.getItem(LS_AVATAR_KEY);
    if (cached) this.avatarPreviewUrl.set(this.withCacheBuster(cached));

    // 2) toujours recharger depuis Storage (source de vérité)
    this.authService.getAvatarFromStorage(user.uid).then(url => {
      if (!url) return;
      this.avatarPreviewUrl.set(this.withCacheBuster(url));
      localStorage.setItem(LS_AVATAR_KEY, url);
    });
  }

  // =========================
  // MOT DE PASSE
  // =========================
  passwordStrength(): '' | 'Faible' | 'Moyen' | 'Fort' {
    const p = this.newPassword().trim();
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

  passwordScore(): number {
    const p = this.newPassword();
    let score = 0;
    if (p.length >= 8) score += 1;
    if (/[A-Z]/.test(p)) score += 1;
    if (/[a-z]/.test(p)) score += 1;
    if (/[0-9]/.test(p)) score += 1;
    if (/[^A-Za-z0-9]/.test(p)) score += 1;
    return score;
  }

  passwordProgress(): number {
    return (this.passwordScore() / 5) * 100;
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
      await this.authService.changePassword(this.currentPassword().trim(), this.newPassword().trim());
      this.success.set('Mot de passe mis à jour avec succès.');
      this.resetPasswordForm();
    } catch (e: any) {
      this.error.set(e?.message || String(e) || 'Erreur lors de la mise à jour du mot de passe.');
    } finally {
      this.passwordLoading.set(false);
    }
  }

  // =========================
  // PROFILE / AVATAR
  // =========================
  async onSaveProfile() {
    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    try {
      await this.authService.updateProfile({
        displayName: `${this.firstName()} ${this.lastName()}`,
        phoneNumber: this.phoneNumber(),
      });

      this.success.set('Profil mis à jour avec succès');
      this.editMode.set(false);
    } catch (e: any) {
      this.error.set(e.message || 'Erreur profil');
    } finally {
      this.loading.set(false);
    }
  }

  private isBlobUrl(url: string) {
    return url.startsWith('blob:');
  }

  private withCacheBuster(url: string) {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}t=${Date.now()}`;
  }

  private saveAvatarToLocalStorage(downloadUrl: string) {
    // On stocke l’URL PROPRE (sans ?t=...), sinon tu empiles des query params
    const clean = downloadUrl.split('?')[0];
    localStorage.setItem(LS_AVATAR_KEY, clean);
  }

  async loadUserAvatar(uid: string) {
    // 1. D'abord le cache local (rapide)
    const cached = localStorage.getItem(LS_AVATAR_KEY);
    if (cached) {
      this.avatarPreviewUrl.set(cached);
    }

    // 2. Ensuite la source de vérité (Storage)
    const url = await this.authService.getAvatarFromStorage(uid);
    if (url) {
      const timestamp = new Date().getTime();

      // --- CORRECTION DU BUG DES DEUX '?' ---
      // Si l'URL a déjà des paramètres (ce qui est le cas avec Firebase), on utilise '&'
      // Sinon on utilise '?'
      const separator = url.includes('?') ? '&' : '?';
      const secureUrl = `${url}${separator}t=${timestamp}`;
      // --------------------------------------

      this.avatarPreviewUrl.set(secureUrl);
      localStorage.setItem(LS_AVATAR_KEY, secureUrl);
    }
  }

  private async loadAvatar() {
    const user = this.authService.currentUser();
    if (!user) return;

    // 1) localStorage (doit être un downloadURL, pas blob)
    const cached = localStorage.getItem(LS_AVATAR_KEY);
    if (cached && !this.isBlobUrl(cached)) {
      this.avatarPreviewUrl.set(this.withCacheBuster(cached));
      return;
    } else if (cached && this.isBlobUrl(cached)) {
      // nettoyage si jamais un blob s'est glissé
      localStorage.removeItem(LS_AVATAR_KEY);
    }

    // 2) Firebase Auth photoURL
    if (user.photoURL && !this.isBlobUrl(user.photoURL)) {
      this.avatarPreviewUrl.set(this.withCacheBuster(user.photoURL));
      this.saveAvatarToLocalStorage(user.photoURL);
      return;
    }

    // 3) Firebase Storage (source de vérité)
    try {
      const url = await this.authService.getAvatarFromStorage(user.uid);
      if (url) {
        this.avatarPreviewUrl.set(this.withCacheBuster(url));
        this.saveAvatarToLocalStorage(url);
      }
    } catch (e) {
      console.error('Erreur loadAvatar:', e);
    }
  }

  async onAvatarSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Preview immédiat (local blob) pour la réactivité
    const localPreview = URL.createObjectURL(file);
    this.avatarPreviewUrl.set(localPreview);

    try {
      // Upload vers Storage
      const uploadedUrl = await this.authService.uploadAvatar(file);

      // On construit l'URL finale avec le cache buster
      const finalUrl = `${uploadedUrl}?t=${new Date().getTime()}`;

      // Mise à jour de l'affichage et du stockage local
      this.avatarPreviewUrl.set(finalUrl);
      localStorage.setItem(LS_AVATAR_KEY, finalUrl);

      this.avatarSuccess.set('Photo mise à jour avec succès');
    } catch (e: any) {
      this.avatarError.set("Erreur lors de l'upload");
    }
  }

  // =========================
  // EMAIL VERIFICATION
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
  // MFA / A2F
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
      await new Promise((r) => setTimeout(r, 300));
      const verificationId = await this.authService.sendMFAVerificationCode(phoneNumber);
      this.mfaVerificationId.set(verificationId);
      this.mfaStep.set('verifying');
      this.success.set('Code SMS envoyé ! Vérifiez votre téléphone et entrez le code reçu.');
    } catch (error: any) {
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

  async onVerifyMFA() {
    const code = this.mfaVerificationCode().trim();
    const verificationId = this.mfaVerificationId();
    const phoneNumber = this.mfaPhoneNumber().trim();

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
    if (!confirm("Êtes-vous sûr de vouloir désactiver l'A2F ?")) return;
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
    if (typeof document === 'undefined') return;
    let container = document.getElementById('recaptcha-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'recaptcha-container';
      const mfaSection = document.querySelector('.mfa-setup') || document.querySelector('.mfa-form');
      if (mfaSection) mfaSection.appendChild(container);
    }
  }

  private cleanupRecaptcha() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('recaptcha-container');
    if (container) container.innerHTML = '';
  }

  openDeleteModal() {
    const el = document.getElementById('deleteAccountModal');
    if (!el || !bootstrap?.Modal) {
      // fallback si bootstrap js pas chargé
      const ok = confirm("Êtes-vous sûr de vouloir supprimer votre compte ?");
      if (ok) this.onDeleteAccount();
      return;
    }

    const modal = bootstrap.Modal.getOrCreateInstance(el, { backdrop: 'static', keyboard: false });
    modal.show();
  }

  closeDeleteModal() {
    const el = document.getElementById('deleteAccountModal');
    if (!el || !bootstrap?.Modal) return;
    const modal = bootstrap.Modal.getInstance(el);
    modal?.hide();
  }

  async confirmDeleteAccount() {
    // ferme le modal Bootstrap si le JS est présent
    this.closeDeleteModal();
    await this.onDeleteAccount();
  }

  async onDeleteAccount() {
    this.error.set('');
    this.success.set('');

    this.deleteLoading.set(true);

    try {
      await this.authService.deleteAccount(this.deletePassword().trim() || undefined);

      // Nettoyage local (optionnel)
      localStorage.removeItem('user_avatar');
      localStorage.removeItem('gopark_avatar_preview');
      localStorage.removeItem('gopark_first_name');
      localStorage.removeItem('gopark_last_name');

      this.success.set('Compte supprimé avec succès.');
    } catch (e: any) {
        console.error('DELETE ERROR:', e);
        // e peut être une string (handleError retourne string)
        const msg = typeof e === 'string' ? e : (e?.message || String(e));
        this.error.set(msg || 'Erreur lors de la suppression du compte.');
    } finally {
      this.deleteLoading.set(false);
      this.deletePassword.set('');
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
