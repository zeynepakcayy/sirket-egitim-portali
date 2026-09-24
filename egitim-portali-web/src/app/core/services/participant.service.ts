import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ManagedTraining, ParticipantList } from '../models/participant.model';

/*
Katılımcı yönetimi. Backend'deki ParticipantsController'ın karşılığı.
Yetki kontrolü backend'de: Instructor başkasının eğitimini isterse 403 döner.
*/
@Injectable({ providedIn: 'root' })
export class ParticipantService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/participants`;

  // GET /api/participants/trainings — seçici için eğitimler
  getManagedTrainings(): Observable<ManagedTraining[]> {
    return this.http.get<ManagedTraining[]>(`${this.baseUrl}/trainings`);
  }

  // GET /api/participants/{trainingId} — o eğitimin katılımcıları
  getParticipants(trainingId: string): Observable<ParticipantList> {
    return this.http.get<ParticipantList>(`${this.baseUrl}/${trainingId}`);
  }

  // PUT /api/participants/{applicationId}/attendance — yoklama işaretle
  // Backend 204 döndürüyor, gövde yok.
  setAttendance(applicationId: string, status: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${applicationId}/attendance`, { status });
  }

  // DELETE /api/participants/{applicationId} — listeden çıkar
  // Backend 204 döndürüyor, gövde yok.
  removeParticipant(applicationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${applicationId}`);
  }
}