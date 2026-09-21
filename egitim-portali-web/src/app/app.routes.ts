import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register'; 

import { Unauthorized } from './features/unauthorized/unauthorized';

import { Layout } from './layout/layout';
import { Dashboard } from './features/dashboard/dashboard';

import { authGuard } from './core/guards/auth.guard';

import { TrainingCatalog } from './features/trainings/training-catalog/training-catalog';
import { TrainingForm } from './features/trainings/training-form/training-form';

import { roleGuard } from './core/guards/role.guard';

import { MyTrainings } from './features/applications/my-trainings/my-trainings';

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

      // Menüde gizlemek koruma sağlamaz, adres elle yazılabiliyor.
      // HRManager başvuru yapamadığı için bu iki sayfa ona kapalı.
      {
        path: 'my-applications',
        component: MyTrainings,
        canActivate: [roleGuard],
        data: { roles: ['Employee', 'Instructor'] }
      },
      {
        path: 'my-certificates',
        component: Dashboard,
        canActivate: [roleGuard],
        data: { roles: ['Employee', 'Instructor'] }
      },

      { path: 'trainings', component: TrainingCatalog },
            // Rol kontrolü: menüde düğmeyi gizlemek koruma sağlamaz,
      // adres elle yazılabiliyor.
      {
        path: 'trainings/create',
        component: TrainingForm,
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'HRManager'] }
      },
      {
        path: 'trainings/:id/edit',
        component: TrainingForm,
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'HRManager'] }
      },
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