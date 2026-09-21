/*
Participants sayfasının veri tipleri.
Alan adları backend'deki DTO'larla (DTOs/Participant/) birebir aynı.
*/

// Sayfanın üstündeki eğitim seçicisinin bir satırı.
// HRManager tüm eğitimleri, Instructor sadece kendi açtıklarını alıyor.
export interface ManagedTraining {
  id: string;
  title: string;
  startDate: string;
  // Hesaplanmış: OpenForApplication, Ongoing, Completed, Cancelled
  status: string;
}

// Listedeki bir kişi. Çıkarma isteği applicationId ile gidiyor.
export interface Participant {
  applicationId: string;
  fullName: string;
  email: string;
  department: string | null;
  // Applied, Waitlisted, Cancelled, Removed
  status: string;
  appliedAt: string;
}

// Seçilen eğitimin katılımcı listesi.
// Katılımcılar başvuru tarihine göre sıralı geliyor.
export interface ParticipantList {
  trainingId: string;
  trainingTitle: string;
  capacity: number;
  participants: Participant[];
}