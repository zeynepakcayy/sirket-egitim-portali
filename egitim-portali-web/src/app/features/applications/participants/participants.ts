import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { DialogModule } from 'primeng/dialog';
import { MessageService } from 'primeng/api';

import { ParticipantService } from '../../../core/services/participant.service';
import { ManagedTraining, Participant, ParticipantList } from '../../../core/models/participant.model';

@Component({
  selector: 'app-participants',
  imports: [DatePipe, FormsModule, SelectModule, DialogModule],
  templateUrl: './participants.html',
  styleUrl: './participants.scss'
})
export class Participants implements OnInit {
  private participantService = inject(ParticipantService);
  private messageService = inject(MessageService);

  // --- Eğitim seçici ---
  trainings = signal<ManagedTraining[]>([]);
  selectedTrainingId = signal<string | null>(null);
  loadingTrainings = signal(true);

  /*
  Açılır listenin seçenekleri. Etikette ad + tarih var: aynı adlı
  iki eğitim olursa ayırt edilsin. Başlamış, bitmiş ya da iptal
  edilmiş eğitimlerde durum da yazıyor — kullanıcı neden
  Remove düğmesi görmediğini anlasın.
  */
  trainingOptions = computed(() =>
    this.trainings().map(t => {
      const date = formatDate(t.startDate, 'd MMM y', 'en-US');
      const suffix = t.status === 'OpenForApplication' ? '' : ` (${this.statusText(t.status)})`;
      return { label: `${t.title} — ${date}${suffix}`, value: t.id };
    })
  );

  // Seçili eğitimin kendisi — durumunu bilmek için.
  selectedTraining = computed(() =>
    this.trainings().find(t => t.id === this.selectedTrainingId()) ?? null);

  // --- Katılımcı listesi ---
  list = signal<ParticipantList | null>(null);
  loadingParticipants = signal(false);
  loadError = signal(false);

  /*
  Üç grup. Backend katılımcıları başvuru tarihine göre sıralı
  gönderiyor; filtre sırayı bozmadığı için yedek listedeki sıra
  numarası (1, 2, 3) doğrudan dizideki konumdan çıkıyor.
  */
  registered = computed(() =>
    this.list()?.participants.filter(p => p.status === 'Applied') ?? []);

  waitlist = computed(() =>
    this.list()?.participants.filter(p => p.status === 'Waitlisted') ?? []);

  // Vazgeçenler ve çıkarılanlar birlikte — ikisi de artık listede değil.
  // Hangisi olduğu rozetinde yazıyor.
  inactive = computed(() =>
    this.list()?.participants.filter(p => p.status === 'Cancelled' || p.status === 'Removed') ?? []);

  /*
  Çıkarma sadece başlamamış ve iptal edilmemiş eğitimde.
  Backend de aynı kuralı uyguluyor; burası boşuna basılacak
  bir düğme göstermemek için.
  */
  canRemove = computed(() => this.selectedTraining()?.status === 'OpenForApplication');

  /*
  Yoklama tam tersi: sadece bitmis egitimde. Backend de ayni
  kurali uyguluyor. Egitim bitmeden "katilmadi" isaretlemek
  anlamsiz olurdu.
  */
  canMarkAttendance = computed(() => this.selectedTraining()?.status === 'Completed');

  attendedCount = computed(() =>
    this.registered().filter(p => p.attendance === 'Attended').length);

  // Hangi satirin istegi yolda. O satirin dugmeleri pasif oluyor,
  // ust uste tiklanip iki istek gitmesin diye.
  savingAttendance = signal<string | null>(null);

  // --- Çıkarma onay penceresi ---
  removeTarget = signal<Participant | null>(null);
  removing = signal(false);

  ngOnInit(): void {
    this.loadTrainings();
  }

  loadTrainings(): void {
    this.loadingTrainings.set(true);

    this.participantService.getManagedTrainings().subscribe({
      next: (items) => {
        this.trainings.set(items);
        this.loadingTrainings.set(false);

        // Sayfa boş açılmasın: en yakın gelecek eğitim otomatik seçiliyor.
        const initial = this.pickDefault(items);
        if (initial !== null) {
          this.selectTraining(initial);
        }
      },
      error: (err) => {
        console.error('Managed trainings error:', err);
        this.loadingTrainings.set(false);
        this.loadError.set(true);
      }
    });
  }

  /*
  Varsayılan seçim. Backend eğitimleri tarihe göre sıralı gönderiyor.
  Önce başvuruya açık ilk eğitim (= en yakın gelecek). Hiç yoksa
  listedeki son eğitim (= en yeni geçmiş). Liste boşsa null.
  */
  private pickDefault(items: ManagedTraining[]): string | null {
    const upcoming = items.find(t => t.status === 'OpenForApplication');
    if (upcoming) return upcoming.id;
    return items.length > 0 ? items[items.length - 1].id : null;
  }

  // Açılır listeden seçim yapılınca ve ilk açılışta çalışıyor.
  selectTraining(id: string): void {
    this.selectedTrainingId.set(id);
    this.loadParticipants();
  }

  loadParticipants(): void {
    const id = this.selectedTrainingId();
    if (id === null) return;

    this.loadingParticipants.set(true);
    this.loadError.set(false);

    this.participantService.getParticipants(id).subscribe({
      next: (result) => {
        this.list.set(result);
        this.loadingParticipants.set(false);
      },
      error: (err) => {
        console.error('Participants error:', err);
        this.list.set(null);
        this.loadingParticipants.set(false);
        this.loadError.set(true);
      }
    });
  }

  // --- Yoklama ---

  /*
  Ayni dugmeye tekrar basmak isaretlemeyi kaldiriyor (Pending'e
  donuyor). Yanlislikla basildiginda geri almanin yolu olsun.

  Basarili olunca butun listeyi yeniden cekmiyoruz, sadece o satiri
  degistiriyoruz: liste uzunsa bekleme olmuyor ve ekran zipzip
  oynamiyor. Yeni nesne uretiyoruz (...item) cunku signal ayni
  nesnenin icini degistirirsek degisimi fark etmiyor.
  */
  markAttendance(p: Participant, status: string): void {
    const next = p.attendance === status ? 'Pending' : status;

    this.savingAttendance.set(p.applicationId);

    this.participantService.setAttendance(p.applicationId, next).subscribe({
      next: () => {
        this.savingAttendance.set(null);
        this.list.update(current => {
          if (current === null) return current;
          return {
            ...current,
            participants: current.participants.map(item =>
              item.applicationId === p.applicationId
                ? { ...item, attendance: next }
                : item
            )
          };
        });
      },
      error: (err) => {
        console.error('Attendance error:', err);
        this.savingAttendance.set(null);
        const summary = typeof err?.error === 'string' && err.error.length > 0
          ? err.error
          : 'Could not save attendance.';
        this.messageService.add({ severity: 'error', summary, life: 4000 });
      }
    });
  }

  // --- Rozet ---

  // Veritabanındaki "Cancelled" kişinin kendi kararı; ekranda
  // "Withdrawn" yazıyoruz ki eğitimin iptaliyle karışmasın.
  // My Trainings'teki adlarla aynı.
  inactiveLabel(p: Participant): string {
    return p.status === 'Removed' ? 'Removed' : 'Withdrawn';
  }

  inactiveClass(p: Participant): string {
    return p.status === 'Removed' ? 'badge-removed' : 'badge-withdrawn';
  }

  // Açılır listedeki durum yazısı.
  private statusText(status: string): string {
    switch (status) {
      case 'Ongoing': return 'In progress';
      case 'Completed': return 'Completed';
      case 'Cancelled': return 'Cancelled';
      default: return status;
    }
  }

  // --- Çıkarma ---

  openRemove(p: Participant): void {
    this.removeTarget.set(p);
  }

  closeRemove(): void {
    this.removeTarget.set(null);
  }

  confirmRemove(): void {
    const target = this.removeTarget();
    if (target === null) return;

    this.removing.set(true);

    this.participantService.removeParticipant(target.applicationId).subscribe({
      next: () => {
        this.removing.set(false);
        this.removeTarget.set(null);
        this.messageService.add({
          severity: 'success',
          summary: `${target.fullName} was removed from the training.`,
          life: 3000
        });
        // Listeyi yeniden çekiyoruz: çıkarılan kişi alt gruba geçiyor,
        // yedekteki biri terfi ettiyse o da yukarı çıkıyor. Bunu
        // frontend'de tahmin etmek yerine backend'in son halini alıyoruz.
        this.loadParticipants();
      },
      error: (err) => {
        console.error('Remove error:', err);
        this.removing.set(false);
        this.removeTarget.set(null);
        const summary = typeof err?.error === 'string' && err.error.length > 0
          ? err.error
          : 'Could not remove this participant.';
        this.messageService.add({ severity: 'error', summary, life: 4000 });
      }
    });
  }
}