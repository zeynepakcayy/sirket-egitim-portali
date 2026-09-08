import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // önce giriş kontrolü. guard'lar sırayla çalışsa da
  // bu guard tek başına da kullanılabilsin diye burada da bakıyoruz.
  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url }
    });
  }

  // Rotanın data alanına yazılan izinli roller
  const allowedRoles = route.data['roles'] as string[] | undefined;

  // Rota rol belirtmemişse, giriş yapmış olmak yeterli
  if (!allowedRoles || allowedRoles.length === 0) {
    return true;
  }

  const userRole = authService.getRole();

  // Kullanıcının rolü izinli listede var mı?
  if (userRole && allowedRoles.includes(userRole)) {
    return true;
  }

  // Yetkisi yok: yetkisiz sayfasına gönder
  return router.createUrlTree(['/unauthorized']);
};