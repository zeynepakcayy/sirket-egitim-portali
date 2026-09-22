import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { InvitableUser } from '../models/user.model';

/*
Kullanıcı listesi. Şimdilik tek metot: yeni eğitime davet
edilebilecek kişiler.

Backend bu endpoint'i sadece Instructor ve HRManager'a açıyor —
eğitim açma formu da sadece o rollerde görünüyor, uyumlu.
*/
@Injectable({ providedIn: 'root' })
export class UserService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/users`;

  // GET /api/users/invitable
  // Employee ve Instructor rolündekiler, giriş yapan kişi hariç.
  // Kimin listede olacağına backend karar veriyor; burada süzme yok.
  getInvitableUsers(): Observable<InvitableUser[]> {
    return this.http.get<InvitableUser[]>(`${this.baseUrl}/invitable`);
  }
}