import { Component, DestroyRef, ElementRef, HostListener, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { interval } from 'rxjs';

import { NotificationService } from '../../core/services/notification.service';
import { NotificationItem } from '../../core/models/notification.model';

/*
Navbar'daki zil ikonu ve altında açılan bildirim paneli.

Layout'un bir parçası olduğu için features altında değil,
layout klasöründe duruyor — tek bir sayfaya değil, uygulamanın
her sayfasına ait.

Panel için PrimeNG bileşeni KULLANILMADI. Tasarım kendi
görünümümüze özel; hazır bir açılır panel bileşeninin iç
yapısını ::ng-deep ile ezmek, düz bir div yazmaktan daha
zahmetli olurdu.
*/
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss'
})
export class NotificationBell implements OnInit {
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  // Bileşenin kendi DOM elemanı. Dışarı tıklamayı anlamak için lazım.
  private host: ElementRef<HTMLElement> = inject(ElementRef);

  /*
  Bileşenin "yok edildim" haberi. 30 saniyelik sorguyu durdurmak
  için lazım — aşağıda anlatılıyor.
  */
  private destroyRef = inject(DestroyRef);

  // Zildeki kırmızı sayı. 0 ise rozet hiç görünmüyor.
  unreadCount = signal(0);

  // Panel açık mı. Zile basınca değişiyor.
  panelOpen = signal(false);

  // Panelin içindeki liste. Panel her açıldığında yeniden doluyor.
  notifications = signal<NotificationItem[]>([]);

  // Liste isteğinin durumu.
  loading = signal(false);
  loadError = signal(false);


  ngOnInit(): void {
    // İlk sayı hemen gelsin, 30 saniye beklemeyelim.
    this.loadUnreadCount();

    /*
    30 saniyede bir sayıyı tazele.

    interval(30000) her 30 saniyede bir sinyal üretiyor. İlk sinyal
    30. saniyede geliyor, o yüzden yukarıda bir kez elle çağırdık.

    takeUntilDestroyed: bileşen ekrandan kalkınca abonelik
    kendiliğinden iptal oluyor. Bu OLMASAYDI kullanıcı çıkış
    yaptıktan sonra bile istekler gitmeye devam ederdi — ve her
    biri 401 dönerdi. Bellek sızıntısının ders kitabı örneği.

    destroyRef'i parametre olarak vermek zorunlu: parametresiz hâli
    sadece constructor ya da alan tanımında çalışıyor, ngOnInit
    içinde çalışmıyor.
    */
    interval(30000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadUnreadCount());
  }


  /*
  Okunmamış sayısını tazeler.

  Hata durumunda hiçbir şey yapmıyoruz — sayı eski değerinde
  kalıyor. Bilerek sessiz: bu istek 30 saniyede bir çalışıyor,
  her başarısızlıkta konsola yazmak konsolu kirletirdi ve
  kullanıcıya gösterecek bir şey de yok. İnternet bir anlık
  kesilirse bir sonraki denemede düzeliyor.
  */
  loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      next: (result) => this.unreadCount.set(result.count),
      error: () => { }
    });
  }


  // Zile basınca.
  togglePanel(): void {
    const willOpen = !this.panelOpen();
    this.panelOpen.set(willOpen);

    // Liste sadece panel AÇILIRKEN çekiliyor. Kapatırken istek yok.
    // Her açılışta tazeleniyor ki panel açıkken gelen bildirimler
    // bir sonraki açılışta görünsün.
    if (willOpen) {
      this.loadNotifications();
    }
  }


  loadNotifications(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.notificationService.getNotifications().subscribe({
      next: (items) => {
        this.notifications.set(items);
        this.loading.set(false);
      },
      error: () => {
        // Hata durumunda listeyi boşaltıyoruz — yoksa hata
        // mesajının altında eski bildirimler durur.
        this.notifications.set([]);
        this.loadError.set(true);
        this.loading.set(false);
      }
    });
  }


  // "Mark all read" düğmesi.
  markAllAsRead(): void {
    // Okunmamış yoksa boşuna istek göndermiyoruz.
    if (this.unreadCount() === 0) {
      return;
    }

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        /*
        Ekranı kendimiz güncelliyoruz, listeyi sunucudan tekrar
        çekmiyoruz. Ne olduğunu zaten biliyoruz: hepsi okundu.
        Yeni bir istek göndermek gereksiz bekleme olurdu.

        map ile YENİ nesneler üretiyoruz; mevcut nesneleri
        değiştirmek signal'ın değişikliği fark etmesini engeller.
        */
        this.notifications.update(items =>
          items.map(item => ({ ...item, isRead: true }))
        );
        this.unreadCount.set(0);
      }
    });
  }


  // Bir bildirime tıklayınca: okundu işaretle, paneli kapat, ilgili sayfaya git.
  openNotification(item: NotificationItem): void {
    if (!item.isRead) {
      this.notificationService.markAsRead(item.id).subscribe({
        next: () => {
          this.notifications.update(items =>
            items.map(n => n.id === item.id ? { ...n, isRead: true } : n)
          );
          // Sayıyı elle düşürüyoruz. Math.max sıfırın altına
          // inmeyi engelliyor — iki tıklama yarışırsa diye.
          this.unreadCount.update(count => Math.max(0, count - 1));
        }
      });
    }

    this.panelOpen.set(false);
    this.navigateFor(item);
  }


  /*
  Bildirim türüne göre hedef sayfa.
  Bu eşleme tek yerde duruyor — türe göre karar veren başka
  bir yer olsaydı biri değişince öteki unutulurdu.
  */
  private navigateFor(item: NotificationItem): void {
    switch (item.type) {
      case 'NewApplication':
        // Eğitmene giden bildirim: katılımcı listesine götür.
        this.router.navigate(['/participants']);
        break;

      case 'CertificateReady':
        this.router.navigate(['/my-certificates']);
        break;

      default:
        /*
        Eğitimle ilgili bildirimler katalogda o eğitimin büyük
        kartını açacak. Adresteki 'open' parametresini katalog
        HENÜZ OKUMUYOR — o kısım 5d-2 adımında gelecek. Şimdilik
        sadece katalog sayfası açılıyor.
        */
        if (item.trainingId) {
          this.router.navigate(['/trainings'], {
            queryParams: { open: item.trainingId }
          });
        } else {
          this.router.navigate(['/trainings']);
        }
        break;
    }
  }


  // Satırdaki ikon. Sekiz tür dört ikonda gruplanıyor —
  // sekiz ayrı ikon koyu temada gürültü yapıyordu.
  iconFor(item: NotificationItem): string {
    switch (item.type) {
      case 'TrainingCancelled':
      case 'RemovedFromTraining':
        return 'pi pi-times-circle';

      case 'PromotedFromWaitlist':
      case 'CertificateReady':
        return 'pi pi-check-circle';

      case 'TrainingUpdated':
      case 'TrainingReminder':
        return 'pi pi-calendar';

      default:
        return 'pi pi-user-plus';
    }
  }


  // İkonun rengi. Şablonda [class.tone-...] ile kullanılıyor.
  tone(item: NotificationItem): string {
    switch (item.type) {
      case 'TrainingCancelled':
      case 'RemovedFromTraining':
        return 'negative';

      case 'PromotedFromWaitlist':
      case 'CertificateReady':
        return 'positive';

      default:
        return 'neutral';
    }
  }


  // Rozetin yazısı. 10 ve üstü "9+" oluyor — iki haneli sayı
  // rozeti büyütüp ikonun üstüne taşıyor.
  badgeLabel(): string {
    const count = this.unreadCount();
    return count > 9 ? '9+' : String(count);
  }


  /*
  "2 hours ago" gibi göreli zaman.
  Tarih sunucudan UTC olarak geliyor (sonunda Z var), new Date
  onu tarayıcının saatine kendisi çeviriyor — elle saat dilimi
  hesabı yapmıyoruz.
  */
  timeAgo(iso: string): string {
    const diffMs = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diffMs / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;

    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

    const months = Math.floor(days / 30);
    return `${months} month${months === 1 ? '' : 's'} ago`;
  }


  /*
  Panelin dışına tıklanınca kapanması.

  Tarayıcıdaki HER tıklamayı dinliyoruz ve tıklanan yer bu
  bileşenin içinde mi diye bakıyoruz. Zilin kendisi de bu
  bileşenin içinde olduğu için zile basmak paneli kapatmıyor —
  onu togglePanel yönetiyor.
  */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.panelOpen.set(false);
    }
  }

  // Esc ile de kapanıyor. Klavyeyle gezen kullanıcı için şart.
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.panelOpen.set(false);
  }
}