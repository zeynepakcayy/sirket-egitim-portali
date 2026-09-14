import { Component, inject, signal, OnInit } from '@angular/core';
import {DatePipe} from '@angular/common'; 
import { TrainingService } from '../../../core/services/training.service';
import { TrainingListItem } from '../../../core/models/training.model';

@Component({
  selector: 'app-training-catalog',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './training-catalog.html',
  styleUrl: './training-catalog.scss'
})
export class TrainingCatalog implements OnInit {
  private trainingService = inject(TrainingService);

  // Ekranda gösterilecek veriler. Signal kullanıyoruz —
  // değer değişince Angular ekranı kendisi güncelliyor.
  trainings = signal<TrainingListItem[]>([]);
  totalCount = signal(0);

  // Sayfa ilk açıldığında bir kez çalışır.
  ngOnInit(): void {
    this.loadTrainings();
  }

  loadTrainings(): void {
    this.trainingService.getTrainings({ page: 1, pageSize: 24 }).subscribe({
      next: (result) => {
        console.log('Gelen veri:', result);
        this.trainings.set(result.items);
        this.totalCount.set(result.totalCount);
      },
      error: (err) => {
        console.error('Hata:', err);
      }
    });
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