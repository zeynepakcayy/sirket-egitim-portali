// Backend'in MyTrainingItemDto karsiligi.
// Tarihler string geliyor (JSON'da Date tipi yok), ekranda cevriliyor.
export interface MyTrainingItem {
  id: string;
  title: string;
  category: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  capacity: number;
  status: string;
  organizerName: string;
  isMine: boolean;
  registeredCount: number;
  waitlistCount: number;
  withdrawnCount: number;
  removedCount: number;
}

// Ustteki kutular
export interface MyTrainingSummary {
  trainingCount: number;
  registered: number;
  waitlisted: number;
  withdrawn: number;
  removed: number;
  cancelledTrainings: number;
}

// Endpoint tek seferde ikisini birden donuyor
export interface MyTrainingsResponse {
  summary: MyTrainingSummary;
  items: MyTrainingItem[];
}