// Backend'den gelen JSON'un şekli. Alan adları birebir aynı olmalı —
// C# tarafında büyük harfle başlıyor ama JSON'a küçük harfle çevriliyor.

// Katalog kartlarında görünen özet bilgi (GET /api/trainings)
export interface TrainingListItem {
  id: string;
  title: string;
  instructorName: string;
  startDate: string;
  endDate: string;
  location: string;
  category: string;
  capacity: number;
  enrolledCount: number;
  status: string;
}

// Büyük kartta görünen tam bilgi (GET /api/trainings/{id})
export interface TrainingDetail extends TrainingListItem {
  description: string;
  instructorAffiliation: string | null;
  instructorEmail: string | null;
  isOwner: boolean;
  // Dış eğitmenli mi? Düzenleme formu onay kutusunu bununla işaretliyor.
  isExternalInstructor: boolean;
  // Giriş yapmış kişinin bu eğitimdeki başvurusu.
  // Başvurmamışsa null — büyük kart Apply ile Withdraw arasında buna göre seçiyor.
  myApplication: MyApplication | null;
}

// Sayfalı cevabın dış zarfı. <T> sayesinde ileride
// başvurular ve sertifikalar için de kullanılabilir.
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}


// POST /api/trainings ve PUT /api/trainings/{id} gövdesi.
// Alan adları backend'deki DTO ile birebir aynı olmalı.
export interface TrainingRequest {
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  category: string;
  capacity: number;
  externalInstructorName: string | null;
  externalInstructorEmail: string | null;
  externalInstructorOrganization: string | null;

  /*
  Yeni eğitime davet edilecek kişilerin kimlikleri.

  SORU İŞARETLİ çünkü sadece POST gövdesinde kullanılıyor.
  Backend'deki UpdateTrainingDto'da böyle bir alan yok; düzenleme
  isteği bunu hiç göndermiyor. Zorunlu yapsaydık TrainingUpdateRequest
  de onu miras alır ve her güncellemede boş bir dizi göndermek
  zorunda kalırdık — gövde yanıltıcı olurdu.
  */
  inviteUserIds?: string[];
}



// Create'in her şeyi + Status. Backend UpdateTrainingDto'da
// Status [Required] olduğu için burada da zorunlu bıraktık —
// unutulursa TypeScript uyarır, 400 beklemeye gerek kalmaz.
export interface TrainingUpdateRequest extends TrainingRequest {
  status: string;
}



// Giriş yapmış kişinin bir eğitimdeki başvurusu.
// Backend'deki MyApplicationDto ile alan adları birebir aynı.
export interface MyApplication {
  id: string;
  status: string;
  appliedAt: string;
}