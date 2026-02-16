import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { getAuth } from 'firebase/auth';

export const adminGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const auth = getAuth();
  const user = auth.currentUser;

  // 1. If not logged in at all, redirect to home
  if (!user) {
    return router.createUrlTree(['/']);
  }

  try {
    // 2. Refresh token to check for the 'admin' claim
    const idTokenResult = await user.getIdTokenResult();
    
    if (idTokenResult.claims['admin']) {
      return true; // Allow access
    } else {
      // 3. Not an admin? Send them back to the Home/Calendar screen
      return router.createUrlTree(['/']);
    }
  } catch (error) {
    return router.createUrlTree(['/']);
  }
};