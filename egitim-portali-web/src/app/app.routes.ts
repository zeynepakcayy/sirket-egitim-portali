import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register'; 

import { Unauthorized } from './features/unauthorized/unauthorized';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'unauthorized', component: Unauthorized },

  //geçici test rotaları-layout gelince silinecek
  {
    path: 'test-auth',
    component: Unauthorized,
    canActivate: [authGuard]
  },
  {
    path: 'test-hr',
    component: Unauthorized,
    canActivate: [roleGuard],
    data: { roles: ['HRManager'] }
  },

  
  { path: '', redirectTo: 'login', pathMatch: 'full' }
];