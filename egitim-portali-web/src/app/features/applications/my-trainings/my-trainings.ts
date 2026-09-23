import {
  Component, inject, signal, computed, effect,
  viewChild, ElementRef, OnInit, OnDestroy
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

/*
Chart.js parça parça çalışıyor: sadece kullandığımız parçaları kaydediyoruz.
Hepsini birden yükleyen 'chart.js/auto' kısayolu uygulamanın boyutunu
gereksiz büyütürdü. Yatay yığılmış çubuk için bu beşi yeterli.
*/
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip
} from 'chart.js';

import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationListItem } from '../../../core/models/application.model';

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

/*
Bir başvurunun sayfadaki yeri. İki ayrı alandan (başvuru durumu +
eğitim durumu) tek bir karar üretiyoruz, liste de grafik de sayaçlar da
buna bakıyor — böylece üçü birbiriyle hiç çelişmiyor.
*/
type Group = 'upcoming' | 'completed' | 'withdrawn' | 'removed' | 'cancelled' | 'notEnrolled';

// Ustteki sayaclardan hangisine basildigi. 'all' = filtre yok.
type CardFilter = 'all' | 'registered' | 'waitlisted' | 'completed';

@Component({
  selector: 'app-my-trainings',
  imports: [DatePipe, FormsModule, SelectModule, DialogModule, RouterLink],
  templateUrl: './my-trainings.html',
  styleUrl: './my-trainings.scss'
})
export class MyTrainings implements OnInit, OnDestroy {
  private applicationService = inject(ApplicationService);
  private messageService = inject(MessageService);

  // History'de bir sayfada kac kayit gorunuyor
  private readonly historyPageSize = 3;

  // --- Veri ve yüklenme durumu ---
  applications = signal<ApplicationListItem[]>([]);
  loading = signal(true);
  loadError = signal(false);

  // --- History filtreleri ---
  // null = "hepsi". Katalogdaki filtrelerle aynı mantık.
  selectedCategory = signal<string | null>(null);
  selectedInstructor = signal<string | null>(null);

  // --- Sayac filtresi ve History sayfasi ---
  cardFilter = signal<CardFilter>('all');
  historyPage = signal(1);

  // --- Withdraw onay penceresi ---
  // Hangi başvurunun geri çekileceği. null ise pencere kapalı.
  withdrawTarget = signal<ApplicationListItem | null>(null);
  withdrawing = signal(false);

  /*
  Grafik renkleri — tasarımda kararlaştırılan dört renk.
  Listedeki rozetler de aynılarını kullanıyor (.scss), grafik ve liste
  birbirini tutsun diye.
  */
  private readonly colors = {
    upcoming: '#1ED99A',
    completed: '#3B82F6',
    withdrawn: '#F59E0B',
    removed: '#A855F7',
    cancelled: '#EF4444'
  };

  // Grafikteki kategori sırası sabit — katalog ve formdaki listeyle aynı.
  private readonly categories = ['Technical', 'Safety', 'Compliance', 'Soft Skills', 'Management'];

  /*
  Bir başvuru hangi gruba giriyor?
  Sıra önemli: "vazgeçtim" her şeyin önünde, çünkü kişi vazgeçtikten
  sonra eğitim iptal edilse bile onun açısından karar zaten verilmişti.
  */
  groupOf(a: ApplicationListItem): Group {
    if (a.status === 'Removed') return 'removed';
    if (a.status === 'Cancelled') return 'withdrawn';
    if (a.trainingStatus === 'Cancelled') return 'cancelled';
    if (a.trainingStatus === 'Completed') {
      // Eğitim bitti ama kişi hâlâ yedekteydi: hiç katılamadı.
      // Tamamlanmış sayılmaz; History'de ayrı görünüyor, grafikte yok.
      return a.status === 'Applied' ? 'completed' : 'notEnrolled';
    }
    // OpenForApplication ya da Ongoing
    return 'upcoming';
  }

  // --- Listeler ---

  // Yaklaşanlar: en yakın tarih üstte.
  upcoming = computed(() =>
    this.applications()
      .filter(a => this.groupOf(a) === 'upcoming')
      .sort((x, y) => x.startDate.localeCompare(y.startDate))
  );

  // Geçmiş: filtrelenmiş, en yeni üstte.
  history = computed(() => {
    const cat = this.selectedCategory();
    const inst = this.selectedInstructor();
    return this.applications()
      .filter(a => this.groupOf(a) !== 'upcoming')
      .filter(a => cat === null || a.category === cat)
      .filter(a => inst === null || a.instructorName === inst)
      .sort((x, y) => y.startDate.localeCompare(x.startDate));
  });

  /*
  Sayaca basilinca hangi bolum gorunuyor:
    Registered / On waitlist -> sadece Upcoming
    Completed                -> sadece History
    filtre yok               -> ikisi birden

  Ilgisiz bolumu bos gostermek yerine tamamen gizliyoruz.
  "Completed"a basip altta bos bir Upcoming gormek kafa karistirirdi.
  */
  showUpcoming = computed(() => this.cardFilter() !== 'completed');

  showHistory = computed(() =>
    this.cardFilter() === 'all' || this.cardFilter() === 'completed'
  );

  visibleUpcoming = computed(() => {
    const list = this.upcoming();
    switch (this.cardFilter()) {
      case 'registered': return list.filter(a => a.status === 'Applied');
      case 'waitlisted': return list.filter(a => a.status === 'Waitlisted');
      default:           return list;
    }
  });

  visibleHistory = computed(() => {
    const list = this.history();
    return this.cardFilter() === 'completed'
      ? list.filter(a => this.groupOf(a) === 'completed')
      : list;
  });

  historyTotalPages = computed(() =>
    Math.max(1, Math.ceil(this.visibleHistory().length / this.historyPageSize))
  );

  // Ekranda gorunen gecmis satirlari. Sayfalama bellekte -
  // kayit sayisi az, sunucudan parca parca istemeye deger degil.
  pagedHistory = computed(() => {
    const start = (this.historyPage() - 1) * this.historyPageSize;
    return this.visibleHistory().slice(start, start + this.historyPageSize);
  });

  // Filtre seçenekleri History'deki kayıtlardan üretiliyor —
  // kişinin hiç almadığı bir kategori listede boşuna durmasın.
  categoryOptions = computed(() => this.buildOptions('All categories',
    this.applications().filter(a => this.groupOf(a) !== 'upcoming').map(a => a.category)));

  instructorOptions = computed(() => this.buildOptions('All instructors',
    this.applications().filter(a => this.groupOf(a) !== 'upcoming').map(a => a.instructorName)));

  private buildOptions(allLabel: string, values: string[]) {
    const unique = [...new Set(values)].sort();
    return [
      { label: allLabel, value: null as string | null },
      ...unique.map(v => ({ label: v, value: v as string | null }))
    ];
  }

  // --- Sayaçlar ---
  registeredCount = computed(() => this.upcoming().filter(a => a.status === 'Applied').length);
  waitlistedCount = computed(() => this.upcoming().filter(a => a.status === 'Waitlisted').length);
  completedCount = computed(() =>
    this.applications().filter(a => this.groupOf(a) === 'completed').length);

  // Grafikte gösterilecek bir şey var mı? (notEnrolled sayılmıyor)
  hasChartData = computed(() =>
    this.applications().some(a => this.groupOf(a) !== 'notEnrolled'));

  // --- Filtre ve sayfalama eylemleri ---

  /*
  Ayni sayaca tekrar basmak filtreyi kaldiriyor - "Show all"a
  gitmek zorunda degilsin.

  Her filtre degisiminde History 1. sayfaya donuyor. Yoksa
  3. sayfadayken filtre uygulanip 2 kayit kalirsa bos ekran gorunurdu.
  */
  setCardFilter(filter: CardFilter): void {
    this.cardFilter.set(this.cardFilter() === filter ? 'all' : filter);
    this.historyPage.set(1);
  }

  clearCardFilter(): void {
    this.cardFilter.set('all');
    this.historyPage.set(1);
  }

  setCategory(value: string | null): void {
    this.selectedCategory.set(value);
    this.historyPage.set(1);
  }

  setInstructor(value: string | null): void {
    this.selectedInstructor.set(value);
    this.historyPage.set(1);
  }

  prevHistoryPage(): void {
    if (this.historyPage() > 1) this.historyPage.update(p => p - 1);
  }

  nextHistoryPage(): void {
    if (this.historyPage() < this.historyTotalPages()) this.historyPage.update(p => p + 1);
  }

  // --- Grafik ---

  /*
  Şablondaki <canvas #chartCanvas> elemanı. Signal olarak geliyor:
  canvas @if içinde olduğu için ekranda olmayabilir — o zaman undefined.
  */
  private chartCanvas = viewChild<ElementRef<HTMLCanvasElement>>('chartCanvas');
  private chart: Chart | null = null;

  /*
  Veri ya da canvas değişince grafiği yeniden çizer.
  effect() içinde okunan her signal "takip ediliyor": applications()
  değişirse (örneğin Withdraw sonrası) bu blok kendiliğinden tekrar çalışıyor.

  Not: grafik sayac filtresine UYMUYOR - bilerek. Grafik zaten
  butun durumlarin kategori dagilimi; filtreleyince anlamsiz kalir.
  */
  private chartEffect = effect(() => {
    const canvas = this.chartCanvas()?.nativeElement;
    const apps = this.applications();

    // Chart.js aynı canvas'a ikinci grafik çizilmesine izin vermiyor,
    // hata fırlatıyor. Her çizimden önce eskisini siliyoruz.
    this.chart?.destroy();
    this.chart = null;

    if (!canvas) return;

    this.chart = this.buildChart(canvas, apps);
  });

  private buildChart(canvas: HTMLCanvasElement, apps: ApplicationListItem[]): Chart {
    // Her kategori için dört grubun sayısını çıkarıyoruz.
    const countFor = (group: Group) =>
      this.categories.map(cat =>
        apps.filter(a => a.category === cat && this.groupOf(a) === group).length);

    // Eksen yazılarının rengi temadan okunuyor — koyu zeminde
    // Chart.js'in varsayılan koyu grisi okunmuyordu.
    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--p-text-muted-color').trim() || '#9ca3af';

    const dataset = (label: string, group: Group, color: string) => ({
      label, data: countFor(group), backgroundColor: color,
      borderRadius: 3, barThickness: 18
    });

    return new Chart(canvas, {
      type: 'bar',
      data: {
        labels: this.categories,
        datasets: [
          dataset('Upcoming', 'upcoming', this.colors.upcoming),
          dataset('Completed', 'completed', this.colors.completed),
          dataset('Withdrawn', 'withdrawn', this.colors.withdrawn),
          dataset('Removed', 'removed', this.colors.removed),
          dataset('Cancelled', 'cancelled', this.colors.cancelled)
        ]
      },
      options: {
        indexAxis: 'y',              // yatay çubuk
        maintainAspectRatio: false,  // yüksekliği CSS'teki kutu belirlesin
        plugins: { legend: { display: false } },  // açıklamayı HTML'de kendimiz çiziyoruz
        scales: {
          x: {
            stacked: true, beginAtZero: true,
            ticks: { stepSize: 1, color: textColor },
            grid: { color: 'rgba(128,128,128,0.15)' }
          },
          y: {
            stacked: true,
            ticks: { color: textColor },
            grid: { display: false }
          }
        }
      }
    });
  }

  // --- Yaşam döngüsü ---

  ngOnInit(): void {
    this.load();
  }

  // Sayfadan çıkınca grafik bellekte kalmasın.
  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  load(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.applicationService.getMyApplications().subscribe({
      next: (items) => {
        this.applications.set(items);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('My applications error:', err);
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }

  // --- Rozet ---

  // Satırdaki rozetin yazısı. Grafikteki adlarla aynı.
  getBadgeLabel(a: ApplicationListItem): string {
    switch (this.groupOf(a)) {
      case 'withdrawn': return 'Withdrawn';
      case 'removed': return 'Removed'; 
      case 'cancelled': return 'Cancelled';
      case 'completed': return 'Completed';
      case 'notEnrolled': return 'Not enrolled';
      default:
        if (a.trainingStatus === 'Ongoing') return 'In progress';
        return a.status === 'Waitlisted' ? 'Waitlisted' : 'Registered';
    }
  }

  getBadgeClass(a: ApplicationListItem): string {
    switch (this.groupOf(a)) {
      case 'withdrawn': return 'badge-withdrawn';
      case 'removed': return 'badge-removed';
      case 'cancelled': return 'badge-cancelled';
      case 'completed': return 'badge-completed';
      case 'notEnrolled': return 'badge-muted';
      default:
        return a.status === 'Waitlisted' ? 'badge-waitlisted' : 'badge-upcoming';
    }
  }

  // Withdraw sadece henüz başlamamış eğitimlerde. Başlamış eğitimden
  // çekilmek anlamsız; backend de izin vermezdi.
  canWithdraw(a: ApplicationListItem): boolean {
    return a.trainingStatus === 'OpenForApplication';
  }

  // --- Withdraw ---

  openWithdraw(a: ApplicationListItem): void {
    this.withdrawTarget.set(a);
  }

  closeWithdraw(): void {
    this.withdrawTarget.set(null);
  }

  confirmWithdraw(): void {
    const target = this.withdrawTarget();
    if (target === null) return;

    this.withdrawing.set(true);

    this.applicationService.withdraw(target.trainingId).subscribe({
      next: () => {
        this.withdrawing.set(false);
        this.withdrawTarget.set(null);
        this.messageService.add({
          severity: 'success',
          summary: "You've withdrawn from this training.",
          life: 3000
        });
        // Listeyi yeniden çekiyoruz. applications() değişince sayaçlar,
        // listeler ve grafik (effect sayesinde) kendiliğinden güncelleniyor.
        this.load();
      },
      error: (err) => {
        console.error('Withdraw error:', err);
        this.withdrawing.set(false);
        this.withdrawTarget.set(null);
        const summary = typeof err?.error === 'string' && err.error.length > 0
          ? err.error
          : 'Could not withdraw from this training.';
        this.messageService.add({ severity: 'error', summary, life: 4000 });
      }
    });
  }
}