/*
Davet listesindeki kişi. Backend'deki InvitableUserDto'nun karşılığı.

E-posta yok: seçim kutusunda ad ve departman gösteriliyor, e-postaya
ihtiyaç duyulmuyor. Backend de bilerek göndermiyor.
*/
export interface InvitableUser {
  id: string;
  fullName: string;

  // Aynı adda iki kişiyi ayırt etmek için. Boş olabilir.
  department: string | null;
}