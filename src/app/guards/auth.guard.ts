
import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  
  return user(auth).pipe(
    map(currentUser => {
      if (!currentUser?.isAnonymous) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};

export const publicGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  
  return user(auth).pipe(
    map(currentUser => {
      if (!currentUser?.isAnonymous) {
        return true;
      }
      router.navigate(['/home']);
      return false;
    })
  );
};
