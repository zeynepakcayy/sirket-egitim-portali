import { Component, inject, signal, computed, OnInit } from '@angular/core';
import {DatePipe} from '@angular/common'; 

//ngModel'i getiriyor
import { FormsModule } from '@angular/forms';
//açılır listenin kendisi
import { SelectModule } from 'primeng/select';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';

import {DialogModule} from 'primeng/dialog';

import { SkeletonModule } from 'primeng/skeleton';

import { MessageService } from 'primeng/api';

import { TrainingService } from '../../../core/services/training.service';
import { ApplicationService } from '../../../core/services/application.service';
import { TrainingListItem, TrainingDetail } from '../../../core/models/training.model';

import { Router } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';


@Component({
  selector: 'app-training-catalog',
  standalone: true,
  //standalone bileşen kullanldığı tanım
  imports: [DatePipe, FormsModule, SelectModule, PaginatorModule, DialogModule, SkeletonModule],
  templateUrl: './training-catalog.html',
  styleUrl: './training-catalog.scss'
})
export class TrainingCatalog implements OnInit {
  private router = inject(Router);

  private authService = inject(AuthService);
  /*
  HRManager tamamen yönetici rolü: her eğitimi düzenleyebiliyor
  ama hiçbirine başvuramıyor. Bu yüzden büyük kartta
  Apply düğmesini hiç görmüyor.
  */
  isHrManager = computed(() => this.authService.currentUser()?.role === 'HRManager');
  
  private trainingService = inject(TrainingService);
  private applicationService = inject(ApplicationService);
  private messageService = inject(MessageService);

  // Ekranda gösterilecek veriler. Signal kullanıyoruz —
  // değer değişince Angular ekranı kendisi güncelliyor.
  trainings = signal<TrainingListItem[]>([]);
  totalCount = signal(0);


  // Kullanıcının o an seçtiği filtreler.
  // null = "hepsi" demek; backend'e hiç gönderilmiyor.
  selectedCategory = signal<string | null>(null);
  selectedInstructor = signal<string | null>(null);
  selectedSort = signal<string>('nearest');

  // Hangi sayfadayız. Şimdilik hep 1; sayfalama 7.9g'de gelecek.
  // Filtre değişince buranın 1'e dönmesi gerektiği için şimdiden duruyor.
  page = signal(1);

  // Kategori listesi sabit — veritabanında Category düz metin olarak
  // tutuluyor, enum değil. Bu yüzden seçenekleri backend'den çekmiyoruz.
  categoryOptions = [
    { label: 'All categories', value: null },
    { label: 'Technical', value: 'Technical' },
    { label: 'Safety', value: 'Safety' },
    { label: 'Compliance', value: 'Compliance' },
    { label: 'Soft Skills', value: 'Soft Skills' },
    { label: 'Management', value: 'Management' }
  ];

  // Sıralama seçenekleri. 'latest' değerini backend tanıyor,
  // onun dışındaki her şeyi "en yakın tarih önce" sayıyor.
  sortOptions = [
    { label: 'Nearest first', value: 'nearest' },
    { label: 'Latest first', value: 'latest' }
  ];

  // Eğitmen listesi backend'den gelecek, o yüzden signal.
  // Başlangıçta içinde sadece "All instructors" var.
  instructorOptions = signal<{ label: string; value: string | null }[]>([
    { label: 'All instructors', value: null }
  ]);

  // Büyük kartın durumu.
  /*
  Pencerenin açık olması ile içeriğinin hazır olması farklı şeyler
  "View details"e basınca pencere anında açılmalı, yoksa kullanıcı düğmenin
  çalışmadığını sanır. Ama veri sunucudan gelene kadar gösterecek bir şey yok.
  Açık/kapalı ayrı, içerik ayrı, bekleme durumu ayrı tutuluyor.
  */
  detailVisible = signal(false);
  selectedTraining = signal<TrainingDetail | null>(null);
  detailLoading = signal(false);

  /*
  Başvuru işlemleri.
  applying: Apply ya da Withdraw isteği yolda mı? Düğmeyi kilitliyor —
    çift tıklamada iki istek gitmesin.
  confirmVisible: Withdraw onay penceresi açık mı?
    Geri çekme geri alınamıyor (yer yedekteki kişiye geçiyor),
    o yüzden tek tıkla olmamalı.
  */
  applying = signal(false);
  confirmVisible = signal(false);


  // Katalog listesinin durumu.
  // loading: istek yolda mı? İskeletler bununla görünüyor.
  // loadError: istek başarısız oldu mu? Try again düğmesi bununla görünüyor.
  loading = signal(false);
  loadError = signal(false);
  // İstek yolda mı? loading'den farkı: bu anında true oluyor,
  // loading ise 200ms gecikmeli. Cevap gelmeden "sonuç yok"
  // mesajının çıkmasını bu engelliyor — liste boş olabilir ama
  // bu "sonuç yok" demek değil, "henüz gelmedi" demek.
  pending = signal(true);

  // İskeletleri tekrarlamak için boş dizi.
  skeletonCards = Array(6);


  // Sayfa ilk açıldığında bir kez çalışır.
  ngOnInit(): void {
    this.loadTrainings();
    this.loadInstructorNames();
  }

  loadTrainings(): void {
    // İstek başlarken eski hatayı temizle. Temizlemezsek başarılı
    // istekten sonra bile hata mesajı ekranda kalır.
    this.loadError.set(false);
    this.pending.set(true);
    // İskeleti hemen göstermiyoruz. İstek 200ms içinde biterse
    // iskelet hiç görünmez — hızlı cevaplarda göz kırpması gibi
    // geçmesi, hiç göstermemekten daha rahatsız edici.
    const skeletonTimer = setTimeout(() => this.loading.set(true), 200);

    this.trainingService.getTrainings({
      page: this.page(),
      pageSize: this.pageSize,
      // ?? undefined dönüşümü şart: signal null tutuyor ama
      // TrainingQuery alanları "string veya yok" diye tanımlı, null kabul etmiyor.
      category: this.selectedCategory() ?? undefined,
      instructor: this.selectedInstructor() ?? undefined,
      sort: this.selectedSort()
    }).subscribe({
      next: (result) => {
        clearTimeout(skeletonTimer);
        this.trainings.set(result.items);
        this.totalCount.set(result.totalCount);
        this.loading.set(false);
        this.pending.set(false);
      },
      error: (err) => {
        clearTimeout(skeletonTimer);
        console.error('Hata:', err);
        // Hata olduğunda eski kartları temizliyoruz. Yoksa hata
        // mesajının altında bir önceki aramanın kartları durur ve
        // kullanıcı hangisinin geçerli olduğunu anlamaz.
        this.trainings.set([]);
        this.totalCount.set(0);
        this.loadError.set(true);
        this.loading.set(false);
        this.pending.set(false);
      }
    });
  }


  // Açılır listedeki eğitmen isimlerini doldurur.
  // Backend düz metin dizisi döndürüyor; p-select nesne beklediği için
  // her ismi { label, value } biçimine çeviriyoruz.
  loadInstructorNames(): void {
    this.trainingService.getInstructorNames().subscribe({
      next: (names) => {
        this.instructorOptions.set([
          { label: 'All instructors', value: null },
          ...names.map(name => ({ label: name, value: name }))
        ]);
      },
      error: (err) => {
        console.error('Instructor list error:', err);
      }
    });
  }

  // Aşağıdaki üç metot aynı işi yapıyor: seçimi kaydet, sayfayı başa al,
  // listeyi yeniden çek. Sayfayı başa almak şart — 3. sayfadayken
  // filtre daraltılırsa sonuç 1 sayfaya düşebilir ve ekran boş kalır.
  onCategoryChange(value: string | null): void {
    this.selectedCategory.set(value);
    this.page.set(1);
    this.loadTrainings();
  }

  // Sayfa başına kaç kart düşeceği. Tek bir yerde duruyor ki
  // serviste, paginator'da ve kaydırma hesabında aynı sayı kullanılsın.
  readonly pageSize = 24;

  // Paginator'dan gelen olay. event.page SIFIRDAN sayıyor
  // (ilk sayfa = 0), bizim backend BİRDEN sayıyor (ilk sayfa = 1).
  // +1 olmazsa kullanıcı 2'ye bastığında 1. sayfayı görür ve
  // bu hata vermeden, sessizce yanlış çalışır.
  onPageChange(event: PaginatorState): void {
    this.page.set((event.page ?? 0) + 1);
    this.loadTrainings();
  }

  // Paginator'a "şu an kaçıncı kayıttan başlıyoruz" diye söylüyoruz.
  // Paginator kendi sayfa durumunu kendi tutuyor; filtre değişip
  // page 1'e döndüğünde bunu haber vermezsek ekranda hâlâ "3" yazılı kalır.
  // Bu metot sayesinde hangi sayfada olduğumuza her zaman biz karar veriyoruz.
  getFirstRecord(): number {
    return (this.page() - 1) * this.pageSize;
  }


  // "View details" düğmesine basınca
  // Pencereyi hemen açıyoruz, veriyi sonra dolduruyoruz.
  openDetail(id: string): void {
    this.selectedTraining.set(null);   // eski eğitimin bilgisi görünmesin
    this.detailLoading.set(true);
    this.detailVisible.set(true);

    this.trainingService.getTraining(id).subscribe({
      next: (detail) => {
        this.selectedTraining.set(detail);
        this.detailLoading.set(false);
      },
      error: (err) => {
        console.error('Detail error:', err);
        this.detailLoading.set(false);
        this.detailVisible.set(false);   // veri gelmediyse boş pencere açık kalmasın
      }
    });
  }

  /*
  Başvurudan ya da geri çekmeden sonra pencerenin içeriğini tazeler.
  openDetail'den farkı: içeriği önce boşaltmıyor. Boşaltsaydı pencere
  bir an "Loading..." gösterip titrerdi; burada eski veri yerinde
  kalıyor, yenisi gelince üzerine yazılıyor.
  */
  private refreshDetail(id: string): void {
    this.trainingService.getTraining(id).subscribe({
      next: (detail) => this.selectedTraining.set(detail),
      error: (err) => console.error('Detail refresh error:', err)
    });
  }

  // Close düğmesi ve dışarı tıklama buraya düşüyor
  closeDetail(): void {
    this.detailVisible.set(false);
  }


  // Büyük karttaki Edit düğmesi. Pencereyi kapatıp
  // düzenleme sayfasına gidiyoruz.
  editTraining(id: string): void {
    this.detailVisible.set(false);
    this.router.navigate(['/trainings', id, 'edit']);
  }

  /*
  Kullanıcının bu eğitimde geçerli bir başvurusu var mı?
  Applied ya da Waitlisted ise evet — Withdraw görmeli.
  Cancelled ise vazgeçmiş demek, tekrar Apply görebilir.
  */
  hasActiveApplication(detail: TrainingDetail): boolean {
    const status = detail.myApplication?.status;
    return status === 'Applied' || status === 'Waitlisted';
  }

  // Apply düğmesi.
  applyToTraining(detail: TrainingDetail): void {
    this.applying.set(true);

    this.applicationService.apply(detail.id).subscribe({
      next: (result) => {
        this.applying.set(false);

        // Backend kişinin hangi duruma düştüğünü söylüyor.
        // Mesaj buna göre değişiyor: yedek listeye düşen kişi
        // "kaydoldum" sanmamalı.
        const summary = result.status === 'Waitlisted'
          ? "You've been added to the waitlist."
          : "You're registered for this training.";
        this.messageService.add({ severity: 'success', summary, life: 3000 });

        // Pencere açık kalıyor, içeriği tazeleniyor (düğme Withdraw'a döner).
        // Arkadaki liste de yenileniyor ki kartlardaki doluluk sayısı güncel olsun.
        this.refreshDetail(detail.id);
        this.loadTrainings();
      },
      error: (err) => {
        this.applying.set(false);
        this.showError(err, 'Could not apply to this training.');
      }
    });
  }

  // Withdraw düğmesi. Doğrudan geri çekmiyor, önce onay penceresini açıyor.
  openWithdrawConfirm(): void {
    this.confirmVisible.set(true);
  }

  closeWithdrawConfirm(): void {
    this.confirmVisible.set(false);
  }

  // Onay penceresindeki Withdraw düğmesi.
  confirmWithdraw(): void {
    const detail = this.selectedTraining();
    if (detail === null) return;

    this.applying.set(true);

    this.applicationService.withdraw(detail.id).subscribe({
      next: () => {
        this.applying.set(false);
        this.confirmVisible.set(false);
        this.messageService.add({
          severity: 'success',
          summary: "You've withdrawn from this training.",
          life: 3000
        });
        this.refreshDetail(detail.id);
        this.loadTrainings();
      },
      error: (err) => {
        this.applying.set(false);
        this.confirmVisible.set(false);
        this.showError(err, 'Could not withdraw from this training.');
      }
    });
  }

  /*
  Backend 400 döndürdüğünde gövdeye düz bir metin yazıyor
  ("This training has already started." gibi). Varsa onu gösteriyoruz,
  kullanıcı neden olmadığını anlasın. Yoksa genel mesaj.
  */
  private showError(err: any, fallback: string): void {
    console.error('Application error:', err);
    const summary = typeof err?.error === 'string' && err.error.length > 0
      ? err.error
      : fallback;
    this.messageService.add({ severity: 'error', summary, life: 4000 });
  }



  onInstructorChange(value: string | null): void {
    this.selectedInstructor.set(value);
    this.page.set(1);
    this.loadTrainings();
  }

  onSortChange(value: string): void {
    this.selectedSort.set(value);
    this.page.set(1);
    this.loadTrainings();
  }


  // Rozetin yazısını belirler.
  // "Apply for Waitlist" veritabanında yok, burada hesaplanıyor:
  // doluluk her onay ve iptalde değişiyor, ayrı durum olarak tutulsaydı
  // güncellenmesi unutulur ve kayıt ile ekran çelişirdi.
  getBadgeLabel(training: TrainingListItem): string {
    if (training.status === 'Cancelled') {
      return 'Cancelled';
    }
    if (training.enrolledCount >= training.capacity) {
      return 'Apply for Waitlist';
    }
    return 'Open for Application';
  }

  // Rozetin rengini belirleyen CSS sınıfı.
  getBadgeClass(training: TrainingListItem): string {
    if (training.status === 'Cancelled') {
      return 'badge-cancelled';
    }
    if (training.enrolledCount >= training.capacity) {
      return 'badge-waitlist';
    }
    return 'badge-open';
  }

  // Doluluk çubuğunun genişliği, yüzde olarak.
  // Kontenjan 0 olabilir — sıfıra bölme hatasını önlüyoruz.
  getFillPercent(training: TrainingListItem): number {
    if (training.capacity === 0) {
      return 100;
    }
    const percent = (training.enrolledCount / training.capacity) * 100;
    return percent > 100 ? 100 : percent;
  }


}