/*
GET /api/applications/my cevabının bir satırı.
Alan adları backend'deki ApplicationListDto ile birebir aynı.

İki ayrı durum var, karıştırılmamalı:
  status         — başvurunun durumu: Applied, Waitlisted, Cancelled
  trainingStatus — eğitimin durumu: OpenForApplication, Ongoing,
                   Completed, Cancelled (backend tarihten hesaplıyor)

Örneğin status "Applied" ama trainingStatus "Cancelled" ise:
kişi kayıtlıydı, eğitimi HR iptal etti.
*/
export interface ApplicationListItem {
  id: string;
  trainingId: string;
  trainingTitle: string;
  category: string;
  instructorName: string;
  startDate: string;
  endDate: string;
  location: string;
  status: string;
  appliedAt: string;
  trainingStatus: string;
}