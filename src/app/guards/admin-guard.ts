import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';

export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const user = auth.currentUser;

  if (user && user.email === 'gopark.management@gmail.com') {
    return true;
  }

  router.navigate(['/login']);
  return false;
};
