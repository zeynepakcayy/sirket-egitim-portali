import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Giriş yapılmışsa yola devam
  if (authService.isLoggedIn()) {
    return true;
  }

  // giriş yapılmamışsa login'e yönlendir.
  // kullanıcının gitmek istediği adresi queryParams ile taşıyoruz
  // giriş yaptıktan sonra oraya geri gönderebilelim.
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};