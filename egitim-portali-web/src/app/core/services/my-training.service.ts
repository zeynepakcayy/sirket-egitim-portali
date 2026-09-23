import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MyTrainingsResponse } from '../models/my-training.model';

@Injectable({ providedIn: 'root' })
export class MyTrainingService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/my-trainings`;

  // GET /api/my-trainings — kutular + liste, tek istek
  getMyTrainings(): Observable<MyTrainingsResponse> {
    return this.http.get<MyTrainingsResponse>(this.baseUrl);
  }
}