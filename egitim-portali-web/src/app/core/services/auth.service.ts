import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthResponse } from '../models/auth-response.model';
import { LoginRequest } from '../models/login-request.model';
import { RegisterRequest } from '../models/register-request.model';


//bir servis ve tüm uygulamada tek bir kopyası
@Injectable({ providedIn: 'root' })
export class AuthService {
  //inject ile HttpClient'i alıyoruz
  private http = inject(HttpClient);
  //apiUrl'i environment.ts dosyasından alıyoruz
  private apiUrl = `${environment.apiUrl}/auth`;

  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';

  /*currentUser signal'ini tanımlıyoruz ve localStorage'dan kullanıcı bilgilerini alıyoruz.
  değer değişince onu kullanan tüm ekranlar otomatik güncellenir*/
  currentUser = signal<AuthResponse | null>(this.readUserFromStorage());

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => this.saveSession(response))
    );
  }

  register(request: RegisterRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, request);
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  getRole(): string | null {
    return this.currentUser()?.role ?? null;
  }

  private saveSession(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(response));
    this.currentUser.set(response);
  }

  private readUserFromStorage(): AuthResponse | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}