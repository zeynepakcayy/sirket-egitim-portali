import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TrainingListItem, TrainingDetail, PagedResult, TrainingRequest, TrainingUpdateRequest } from '../models/training.model';

// Katalog listesini çekerken gönderilebilecek seçenekler.
// Hepsi isteğe bağlı (?) — gönderilmeyeni backend varsayılanla dolduruyor.
export interface TrainingQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  instructor?: string;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/trainings`;

  // GET /api/trainings — katalog listesi, sayfalı
  getTrainings(query: TrainingQuery = {}): Observable<PagedResult<TrainingListItem>> {
    // HttpParams, adresin sonundaki ?page=1&category=Safety kısmını kuruyor.
    // Boş bırakılan filtreleri hiç eklemiyoruz ki backend "All" gibi davransın.
    let params = new HttpParams()
      .set('page', query.page ?? 1)
      .set('pageSize', query.pageSize ?? 24);

    if (query.category) params = params.set('category', query.category);
    if (query.instructor) params = params.set('instructor', query.instructor);
    if (query.sort) params = params.set('sort', query.sort);

    return this.http.get<PagedResult<TrainingListItem>>(this.baseUrl, { params });
  }

  // GET /api/trainings/{id} — büyük kartın içeriği
  getTraining(id: string): Observable<TrainingDetail> {
    return this.http.get<TrainingDetail>(`${this.baseUrl}/${id}`);
  }

  // GET /api/trainings/instructors — filtre açılır listesi için isimler
  getInstructorNames(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/instructors`);
  }

    // POST /api/trainings — yeni eğitim oluşturur.
  // Backend oluşturulan kaydın id'sini döndürüyor.
  createTraining(request: TrainingRequest): Observable<string> {
    return this.http.post<string>(this.baseUrl, request);
  }


  // PUT /api/trainings/{id} — mevcut eğitimi günceller.
  // Backend 204 No Content döndürüyor, yani cevap gövdesi boş.
  updateTraining(id: string, request: TrainingUpdateRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, request);
  }

}