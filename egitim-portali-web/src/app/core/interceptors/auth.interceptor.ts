import {HttpInterceptorFn} from '@angular/common/http';
import {inject} from '@angular/core';
import {AuthService} from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // AuthService'i al
  const authService = inject(AuthService);
  const token = authService.getToken();

   // Token yoksa isteğe hiç dokunma, olduğu gibi devam etsin
  if (!token) {
    return next(req);
  }

  // isteğin kopyasını çıkar ve kopyaya Authorization başlığını ekle
  // bir interceptor isteği bozarsa diğerleri etkilenmesin diye
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  // değiştirilmiş isteği zincirdeki bir sonrakine devret
  return next(authReq);
};