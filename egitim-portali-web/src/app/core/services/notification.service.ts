import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationItem, UnreadCount } from '../models/notification.model';

/*
Bildirim okuma. Zil ikonu bunu kullanıyor.
Backend'de /api/notifications altında dört endpoint var:
ikisi okuma, ikisi okundu işaretleme.

Dikkat: bu servis bildirim OLUŞTURMUYOR. Bildirimleri backend
kendi içinde üretiyor (eğitim iptal edilince, biri başvurunca...).
Frontend sadece okuyor ve okundu işaretliyor.
*/
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/notifications`;

  // GET /api/notifications/unread-count
  // 30 saniyede bir çağrılacak olan istek bu. Bilerek çok hafif:
  // sadece { count: 3 } dönüyor, hiçbir bildirim metni taşınmıyor.
  // Sayım veritabanında yapılıyor, satırlar backend'e bile gelmiyor.
  getUnreadCount(): Observable<UnreadCount> {
    return this.http.get<UnreadCount>(`${this.baseUrl}/unread-count`);
  }

  // GET /api/notifications
  // Zile tıklanınca çağrılıyor. Son 20 bildirim, yeniden eskiye.
  // Sınırı backend koyuyor — buradan sayfa ya da adet göndermiyoruz.
  getNotifications(): Observable<NotificationItem[]> {
    return this.http.get<NotificationItem[]>(this.baseUrl);
  }

  // PUT /api/notifications/{id}/read
  // Tek bildirimi okundu yapar. Backend 204 döndürüyor, gövde yok.
  markAsRead(id: string): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/read`, {});
  }

  // PUT /api/notifications/read-all
  // Kişinin tüm okunmamışlarını okundu yapar. "Mark all read" bunu çağırıyor.
  markAllAsRead(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/read-all`, {});
  }
}