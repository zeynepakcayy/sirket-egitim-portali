import { Component, Type, computed, inject } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';

import { AuthService } from '../../core/services/auth.service';
import { MyTrainings } from '../applications/my-trainings/my-trainings';
import { ManagedTrainings } from '../trainings/managed-trainings/managed-trainings';

/*
Dashboard'in kapisi. Icinde hangi sayfanin duracagina role gore
karar veriyor:
  HRManager -> yonettigi egitimler (ManagedTrainings)
  digerleri -> kaydoldugu egitimler (MyTrainings)

Neden ayri bir bilesen: adres herkes icin ayni kaliyor
(/dashboard), sadece icerik degisiyor. Menude tek bir Dashboard
maddesi yetiyor, role gore ikinci bir rota tanimlamiyoruz.
*/
@Component({
  selector: 'app-home',
  imports: [NgComponentOutlet],
  template: '<ng-container *ngComponentOutlet="page()"></ng-container>'
})
export class Home {
  private authService = inject(AuthService);

  /*
  Bilesenin KENDISINI tutuyoruz, ornegini degil - sonda parantez
  yok. Olusturma isini ngComponentOutlet yapiyor.

  Type<unknown> etiketi sart: etiketsiz birakinca TypeScript
  "ya su sinif ya bu sinif" diye bir birlesim tipi cikariyor,
  ngComponentOutlet ise tek bir tip bekliyor. Type<unknown>
  "herhangi bir bilesen sinifi" demek.
  */
  page = computed<Type<unknown>>(() =>
    this.authService.currentUser()?.role === 'HRManager' ? ManagedTrainings : MyTrainings
  );
}