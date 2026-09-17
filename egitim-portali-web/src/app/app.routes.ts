import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register'; 

import { Unauthorized } from './features/unauthorized/unauthorized';

import { Layout } from './layout/layout';
import { Dashboard } from './features/dashboard/dashboard';

import { authGuard } from './core/guards/auth.guard';

import { TrainingCatalog } from './features/trainings/training-catalog/training-catalog';
import { TrainingForm } from './features/trainings/training-form/training-form';

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
      { path: 'trainings', component: TrainingCatalog },
      { path: 'trainings/create', component: TrainingForm },
      // Düzenleme aynı bileşeni kullanıyor. :id bir yer tutucu —
      // adresteki gerçek değer bileşen içinde okunacak.
      { path: 'trainings/:id/edit', component: TrainingForm },
      { path: 'approvals', component: Dashboard },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Bilinmeyen adresler
  { path: '**', redirectTo: 'dashboard' }

];