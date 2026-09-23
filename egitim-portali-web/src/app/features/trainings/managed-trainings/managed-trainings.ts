import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { MyTrainingService } from '../../../core/services/my-training.service';
import { MyTrainingItem, MyTrainingSummary } from '../../../core/models/my-training.model';
import { AuthService } from '../../../core/services/auth.service';

// Ustteki kutulardan hangisine basildigi. 'all' = filtre yok.
type ListFilter = 'all' | 'registered' | 'waitlist' | 'withdrawn' | 'removed' | 'cancelled';

/*
"Benim actigim egitimler" sayfasi.

Sinif adi ManagedTrainings - mevcut MyTrainings bileseni
(artik Dashboard olan sayfa) ile karismasin diye. Ikisi ayri
sey: bu yonettigim egitimler, oteki kaydoldugum egitimler.
*/
@Component({
  selector: 'app-managed-trainings',
  imports: [RouterLink, DatePipe],
  templateUrl: './managed-trainings.html',
  styleUrl: './managed-trainings.scss'
})
export class ManagedTrainings implements OnInit {
  private myTrainingService = inject(MyTrainingService);
  private authService = inject(AuthService);

  private readonly pageSize = 5;

  loading = signal(false);
  loadError = signal(false);
  summary = signal<MyTrainingSummary | null>(null);
  items = signal<MyTrainingItem[]>([]);

  // Sadece HR'da gorunuyor: HR herkesin egitimini goruyor,
  // bazen kendi actiklarina bakmak istiyor.
  onlyMine = signal(false);

  activeFilter = signal<ListFilter>('all');
  page = signal(1);

  isHrManager = computed(() => this.authService.currentUser()?.role === 'HRManager');

  // Metinleri sablonda @if ile kurmak yerine burada hazirliyoruz.
  // Sablon icindeki { } isaretleri Angular'in blok ayristiricisini
  // yaniltabiliyor - mantik burada, sablonda sadece goruntu.
  roleLabel = computed(() =>
    this.isHrManager() ? 'HR Manager · all trainings' : 'Instructor'
  );

  listTitle = computed(() =>
    this.isHrManager() ? 'All trainings' : 'Created by me'
  );

  /*
  Iki kademeli suzme:
    1. onlyMine - HR'in "sadece benim actiklarim" kutusu
    2. activeFilter - ustteki kutulardan birine basilmis olmasi

  Ikisi de bellekte calisiyor, yeni istek atilmiyor. Veri elimizde,
  sadece hangisini gosterecegimize karar veriyoruz.
  */
  filteredItems = computed(() => {
    const all = this.items();
    const byOwner = this.onlyMine() ? all.filter(item => item.isMine) : all;

    switch (this.activeFilter()) {
      case 'registered': return byOwner.filter(i => i.registeredCount > 0);
      case 'waitlist':   return byOwner.filter(i => i.waitlistCount > 0);
      case 'withdrawn':  return byOwner.filter(i => i.withdrawnCount > 0);
      case 'removed':    return byOwner.filter(i => i.removedCount > 0);
      case 'cancelled':  return byOwner.filter(i => i.status === 'Cancelled');
      default:           return byOwner;
    }
  });

  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredItems().length / this.pageSize))
  );

  // Ekranda gorunen satirlar. Sayfalama da bellekte -
  // liste 15-20 kayit, sunucudan parca parca istemeye deger degil.
  pagedItems = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredItems().slice(start, start + this.pageSize);
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.myTrainingService.getMyTrainings().subscribe({
      next: (response) => {
        this.summary.set(response.summary);
        this.items.set(response.items);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  // Filtre degisince 1. sayfaya donuyoruz. Yoksa 3. sayfadayken
  // filtre uygulanip 1 sonuc kalirsa bos ekran gorunurdu.
  setFilter(filter: ListFilter): void {
    this.activeFilter.set(this.activeFilter() === filter ? 'all' : filter);
    this.page.set(1);
  }

  clearFilter(): void {
    this.activeFilter.set('all');
    this.page.set(1);
  }

  toggleOnlyMine(checked: boolean): void {
    this.onlyMine.set(checked);
    this.page.set(1);
  }

  prevPage(): void {
    if (this.page() > 1) this.page.update(p => p - 1);
  }

  nextPage(): void {
    if (this.page() < this.totalPages()) this.page.update(p => p + 1);
  }

  /*
  Grafik verisi. Suzulmus listeden besleniyor - kutuya basilinca
  grafik de o filtreye gore degisiyor, liste ile tutarli kaliyor.

  Ilk 6 egitim: 20 sutun yan yana okunmaz. Iptal edilmisler yok,
  katilimcisi sifir oldugu icin sadece bos yer kaplarlar.

  Yuksekligi burada hesapliyoruz cunku HTML'de matematik yapilamaz.
  max en az 1 - butun sayilar sifirken bolme hatasi olmasin.
  */
  chartBars = computed(() => {
    const rows = this.filteredItems()
      .filter(item => item.status !== 'Cancelled')
      .slice(0, 6);

    const plotHeight = 110;
    const max = Math.max(1, ...rows.map(r => r.registeredCount + r.waitlistCount));

    return rows.map(row => ({
      label: this.shortLabel(row.title),
      fullLabel: row.title,
      registered: row.registeredCount,
      waitlist: row.waitlistCount,
      registeredHeight: Math.round((row.registeredCount / max) * plotHeight),
      waitlistHeight: Math.round((row.waitlistCount / max) * plotHeight)
    }));
  });

  // Uzun egitim adlari sutunlarin altina sigmiyor
  private shortLabel(title: string): string {
    return title.length <= 12 ? title : title.slice(0, 11) + '…';
  }

  // Durum etiketinin rengi
  statusClass(status: string): string {
    switch (status) {
      case 'Cancelled': return 'chip-negative';
      case 'Completed': return 'chip-neutral';
      case 'Ongoing':   return 'chip-accent';
      default:          return 'chip-positive';
    }
  }

  isFull(item: MyTrainingItem): boolean {
    return item.registeredCount >= item.capacity;
  }

  // Tarihten sonra gelen "· yer · kategori" kismi.
  // Ikisi de bos olabilir, o yuzden varsa ekliyoruz.
  metaSuffix(item: MyTrainingItem): string {
    const parts: string[] = [];
    if (item.location) parts.push(item.location);
    if (item.category) parts.push(item.category);
    return parts.length > 0 ? ' · ' + parts.join(' · ') : '';
  }
}