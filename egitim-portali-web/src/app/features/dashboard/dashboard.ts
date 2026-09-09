import { Component, computed, inject } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="text-500 mb-1">Dashboard</div>
    <h1 class="mt-0 mb-4">Welcome, {{ firstName() }}</h1>
    <p class="text-500">Content will be added in phase 7.</p>
  `
})
export class Dashboard {
  private authService = inject(AuthService);

  // "Onur Yilmaz" → "Onur"
  firstName = computed(() => {
    const name = this.authService.currentUser()?.fullName ?? '';
    return name.trim().split(/\s+/)[0] ?? '';
  });
}