import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplicationListItem } from '../models/application.model';

/*
Başvuru işlemleri. Eğitim servisinden ayrı tutuldu çünkü
backend'de de ayrı bir controller var (/api/applications) —
ileride My Trainings sayfası da bu servisi kullanacak.
*/
@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/applications`;

  // POST /api/applications/{trainingId}
  // Backend kişinin hangi duruma düştüğünü döndürüyor:
  // "Applied" ya da "Waitlisted". Toast mesajı buna göre seçilecek.
  apply(trainingId: string): Observable<{ status: string }> {
    return this.http.post<{ status: string }>(`${this.baseUrl}/${trainingId}`, {});
  }

  // DELETE /api/applications/{trainingId}
  // Başvuruyu geri çeker. Backend 204 döndürüyor, gövde yok.
  withdraw(trainingId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${trainingId}`);
  }

  // GET /api/applications/my
  // Giriş yapmış kişinin tüm başvuruları — vazgeçtikleri dahil.
  // My Trainings sayfası listeyi, sayaçları ve grafiği bundan üretiyor.
  // Sayfalama yok: bir kişinin başvuru sayısı katalogdaki eğitim
  // sayısı kadar büyümez, tek istekte hepsini almak yeterli.
  getMyApplications(): Observable<ApplicationListItem[]> {
    return this.http.get<ApplicationListItem[]>(`${this.baseUrl}/my`);
  }
}