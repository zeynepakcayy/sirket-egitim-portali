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