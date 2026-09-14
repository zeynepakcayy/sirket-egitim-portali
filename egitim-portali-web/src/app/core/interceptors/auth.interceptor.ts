import {HttpInterceptorFn, HttpErrorResponse} from '@angular/common/http';
import {inject} from '@angular/core';
import {Router} from '@angular/router';
import { catchError, throwError } from 'rxjs';
import {AuthService} from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // AuthService'i al
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Token varsa isteğin kopyasına Authorization başlığını ekliyoruz.
  // Kopya çıkarıyoruz çünkü HttpRequest değiştirilemez (immutable).
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;


  //Giden isteği değil, gelen cevabı dinliyor
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Giriş isteğinin kendisi bu kuralın dışında.
      // Yanlış şifre de 401 döndürüyor; kullanıcıyı giriş ekranına
      // yollamak yerine formdaki hata mesajı görünmeli.
      const isLoginRequest = req.url.includes('/auth/login');

      if (error.status === 401 && !isLoginRequest) {
        // Token geçersiz ya da süresi dolmuş: oturumu kapat,
        // kullanıcıyı giriş ekranına gönder, döndüğü yeri hatırla.
        authService.logout();
        router.navigate(['/login'], {
          queryParams: { returnUrl: router.url }
        });
      }

      // Hatayı yutmuyoruz, isteği yapan bileşen de haberdar olsun.
      return throwError(() => error);
    })
  );
};