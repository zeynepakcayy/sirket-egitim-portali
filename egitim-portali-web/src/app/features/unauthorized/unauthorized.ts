import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  imports: [Button],
  templateUrl: './unauthorized.html'
})
export class Unauthorized {
  private router = inject(Router);
  private authService = inject(AuthService);

  // Kullanıcıya hangi rolle giriş yaptığını göstermek için
  currentRole = this.authService.getRole();

  goBack(): void {
    this.router.navigate(['/login']);
  }
}