import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register'; 

import { Unauthorized } from './features/unauthorized/unauthorized';

import { Layout } from './layout/layout';
import { Dashboard } from './features/dashboard/dashboard';

import { authGuard } from './core/guards/auth.guard';

import { TrainingCatalog } from './features/trainings/training-catalog/training-catalog';
import { TrainingForm } from './features/trainings/training-form/training-form';
import { ManagedTrainings } from './features/trainings/managed-trainings/managed-trainings';

import { roleGuard } from './core/guards/role.guard';

import { MyTrainings } from './features/applications/my-trainings/my-trainings';

import { Participants } from './features/applications/participants/participants';

import { Home } from './features/home/home';

import { MyCertificates } from './features/certificates/my-certificates/my-certificates';

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
      // Dashboard artık boş bir sayfa değil: kaydolduğum egitimler,
      // ozet kutulari ve kategori grafigi. Her rol goruyor -
      // HR de bir egitime kaydolursa burada gorur.
      { path: 'dashboard', component: Home },

      // Eski adres. Kimsenin kaydettigi link kirilmasin diye
      // dashboard'a yonlendiriyoruz.
      { path: 'my-applications', redirectTo: 'dashboard', pathMatch: 'full' },

      // Yonettigim egitimler. Instructor kendininkini, HR hepsini
      // goruyor - ayrimi backend yapiyor. Employee'ye kapali:
      // menude gizlemek koruma saglamaz, adres elle yazilabiliyor.
      {
        path: 'my-trainings',
        component: ManagedTrainings,
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'HRManager'] }
      },

      // Menüde gizlemek koruma sağlamaz, adres elle yazılabiliyor.
      // HRManager başvuru yapamadığı için bu sayfa ona kapalı.
      {
        path: 'my-certificates',
        component: MyCertificates,
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
      // Düzenleme aynı bileşeni kullanıyor. :id bir yer tutucu —
      // adresteki gerçek değer bileşen içinde okunacak.
      {
        path: 'trainings/:id/edit',
        component: TrainingForm,
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'HRManager'] }
      },

      // Onay akışı kaldırılınca Approvals sayfası anlamını yitirdi,
      // yerine katılımcı yönetimi geldi. Employee'ye kapalı.
      {
        path: 'participants',
        component: Participants,
        canActivate: [roleGuard],
        data: { roles: ['Instructor', 'HRManager'] }
      },
      
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Bilinmeyen adresler
  { path: '**', redirectTo: 'dashboard' }

];