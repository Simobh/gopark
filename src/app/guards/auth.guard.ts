import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();

      if (user) {
        resolve(true);
      } else {
        resolve(router.createUrlTree(['/login']));
      }
    });
  });
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();

      if (user) {
        resolve(router.createUrlTree(['/home']));
      } else {
        resolve(true);
      }
    });
  });
};
