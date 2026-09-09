import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register'; 

import { Unauthorized } from './features/unauthorized/unauthorized';

import { Layout } from './layout/layout';
import { Dashboard } from './features/dashboard/dashboard';

import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  //layout dışında, tam ekran açılan sayfalar
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'unauthorized', component: Unauthorized },

  //layout içinde, navbar-sidebar ile açılan sayfalar
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: Dashboard },
      { path: 'my-applications', component: Dashboard },
      { path: 'my-certificates', component: Dashboard },
      { path: 'trainings', component: Dashboard },
      { path: 'trainings/create', component: Dashboard },
      { path: 'approvals', component: Dashboard },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Bilinmeyen adresler
  { path: '**', redirectTo: 'dashboard' }

];