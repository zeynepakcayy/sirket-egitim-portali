import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from 'primeng/api';
import { Router, ActivatedRoute} from '@angular/router';
import { TrainingService } from '../../../core/services/training.service';
import { UserService } from '../../../core/services/user.service';
import { TrainingRequest, TrainingUpdateRequest, TrainingDetail } from '../../../core/models/training.model';
import { InvitableUser } from '../../../core/models/user.model';

@Component({
  selector: 'app-training-form',
  imports: [
    FormsModule,
    DatePickerModule,
    SelectModule,
    MultiSelectModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule
  ],
  templateUrl: './training-form.html',
  styleUrl: './training-form.scss'
})
export class TrainingForm implements OnInit {
  private authService = inject(AuthService);
  private messageService = inject(MessageService);


  private trainingService = inject(TrainingService);
  private userService = inject(UserService);
  private router = inject(Router);



  private route = inject(ActivatedRoute);

  /*
  Düzenleme modu. Adres /trainings/:id/edit ise editingId dolu,
  /trainings/create ise null. Tek bileşen iki iş yapıyor:
  başlık, düğme yazısı ve kaydetme davranışı buna göre değişiyor.
  */
  editingId = signal<string | null>(null);
  isEditMode = computed(() => this.editingId() !== null);

  // Düzenleme modunda eğitim çekilirken ekranda bir şey yok.
  loadingDetail = signal(false);

  /*
  Eğitimin durumu. Sadece düzenleme modunda görünüyor —
  oluştururken backend otomatik OpenForApplication atıyor.

  Listede iki seçenek var: Ongoing ve Completed veritabanında
  tutulmuyor, backend tarihten hesaplıyor. Kullanıcıya
  seçtirilmesi anlamsız olurdu.
  */
  status = signal<string>('OpenForApplication');

  statusOptions = [
    { label: 'Open for Application', value: 'OpenForApplication' },
    { label: 'Cancelled', value: 'Cancelled' }
  ];

  // Düzenlemede Clear, formu boşaltmak yerine kayıttaki
  // değerlere geri dönmeli. Çekilen veriyi bunun için saklıyoruz.
  private loadedDetail: TrainingDetail | null = null;


  /*
  --- Davet edilecek kişiler ---

  Sadece YENİ eğitim oluştururken görünüyor. Düzenlemede yok:
  form her kaydedişte aynı kişilere tekrar davet gönderirdi.
  "Mevcut eğitime davet et" ayrı bir özellik olarak eklenebilir.
  */
  invitableUsers = signal<InvitableUser[]>([]);
  inviteUserIds = signal<string[]>([]);

  /*
  Seçim kutusuna verilecek seçenekler. Ad ve departman tek metinde
  birleşiyor — aynı adda iki kişi varsa ayırt edilebilsin.

  Ayrı bir satır şablonuyla (pTemplate) iki satırlı görünüm de
  yapılabilirdi ama PrimeNG 22'deki yazımı doğrulanmadı. Tek metin
  hem güvenli hem de aramada işe yarıyor: kullanıcı departman adı
  yazarak da süzebiliyor.
  */
  inviteOptions = computed(() =>
    this.invitableUsers().map(user => ({
      id: user.id,
      label: user.department
        ? `${user.fullName} — ${user.department}`
        : user.fullName
    }))
  );


  // Kaydetme sürerken düğmeyi kilitliyoruz — çift tıklamada
  // iki eğitim oluşmasın.
  saving = signal(false);


  // Giriş yapmış kullanıcı. Dış eğitmen kutusu kapalıyken
  // onun bilgileri alanlarda gösteriliyor.
  currentUser = this.authService.currentUser;


  // Dış eğitmen seçeneği sadece HRManager'a açık.
  // Backend de aynı kuralı uyguluyor — burası sadece
  // işe yaramayacak bir kutuyu göstermemek için.
  canUseExternal = computed(() => this.currentUser()?.role === 'HRManager');


  // Takvimde geçmiş günler seçilemesin diye alt sınır.
  // Gerekli çünkü katalog sadece StartDate > now olanları listeliyor —
  // geçmiş tarihli bir eğitim kaydedilir ama hiçbir yerde görünmez.
  today = new Date();

  // --- Form alanları ---
  title = signal('');
  category = signal<string | null>(null);
  capacity = signal<number | null>(null);
  location = signal('');
  description = signal('');

  // Tarihler Date nesnesi, saatler metin. Backend ikisini
  // birleştirilmiş halde bekliyor — gönderirken birleştireceğiz.
  startDate = signal<Date | null>(null);
  startTime = signal('');
  endDate = signal<Date | null>(null);
  endTime = signal('');

  // --- Dış eğitmen ---
  isExternal = signal(false);
  externalName = signal('');
  externalEmail = signal('');
  externalOrganization = signal('');

  // Kategori listesi katalogdakiyle aynı. Sabit çünkü
  // veritabanında Category düz metin olarak tutuluyor, enum değil.
  categoryOptions = [
    { label: 'Technical', value: 'Technical' },
    { label: 'Safety', value: 'Safety' },
    { label: 'Compliance', value: 'Compliance' },
    { label: 'Soft Skills', value: 'Soft Skills' },
    { label: 'Management', value: 'Management' }
  ];

  // Bitiş takviminin alt sınırı. Başlangıç seçilmemişse bugün,
  // seçilmişse o gün. Takvimde daha erken günler tıklanamaz hale geliyor.
  endMinDate = signal<Date>(new Date());

  // Başlangıç tarihi takvimden seçilince bitiş tarihini de
  // aynı güne alıyoruz. Çoğu eğitim tek günlük; kullanıcı
  // farklıysa bitiş tarihini kendisi değiştirebiliyor.
  onStartDateSelect(date: Date): void {
    this.startDate.set(date);
    this.endMinDate.set(date);

    // Seçili bitiş tarihi artık başlangıçtan önce kalıyorsa
    // onu da ileri alıyoruz. Yoksa ekranda geçersiz bir aralık kalır.
    const currentEnd = this.endDate();
    if (currentEnd === null || currentEnd < date) {
      this.endDate.set(date);
    }
  }

  onEndDateSelect(date: Date): void {
    this.endDate.set(date);
  }



  ngOnInit(): void {
    // Adresteki :id yer tutucusu. Oluşturma adresinde bu parametre
    // hiç yok, o yüzden null dönüyor.
    const id = this.route.snapshot.paramMap.get('id');
    if (id !== null) {
      this.editingId.set(id);
      this.loadTraining(id);
    } else {
      // Davet seçici sadece oluşturma modunda var, listeyi de
      // sadece o modda çekiyoruz. Düzenlemede gereksiz istek olurdu.
      this.loadInvitableUsers();
    }
  }


  /*
  Davet edilebilecek kişileri çeker.

  Hata durumunda seçici boş kalıyor ve formu bloke etmiyoruz:
  davet zorunlu değil, eğitim yine oluşturulabilir. Kullanıcıyı
  ilgilendirmeyen bir hata için formu kullanılamaz hale getirmek
  yanlış olurdu.
  */
  private loadInvitableUsers(): void {
    this.userService.getInvitableUsers().subscribe({
      next: (users) => this.invitableUsers.set(users),
      error: (err) => {
        console.error('Invitable users error:', err);
      }
    });
  }


  loadTraining(id: string): void {
    this.loadingDetail.set(true);

    this.trainingService.getTraining(id).subscribe({
      next: (detail) => {
        this.loadedDetail = detail;
        this.fillForm(detail);
        this.loadingDetail.set(false);
      },
      error: (err) => {
        console.error('Load error:', err);
        this.loadingDetail.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Could not load the training.',
          life: 4000
        });
        this.router.navigate(['/trainings']);
      }
    });
  }

  /*
  Gelen kaydı form alanlarına dağıtır.

  Dış eğitmen alanlarının doldurulması KRİTİK: PUT isteği gelen
  değeri koşulsuz yazıyor. Doldurmazsak kullanıcı sadece başlığı
  değiştirip kaydettiğinde dış eğitmen bilgileri sessizce silinir.
  */
  private fillForm(detail: TrainingDetail): void {
    this.title.set(detail.title);
    this.category.set(detail.category);
    this.capacity.set(detail.capacity);
    this.location.set(detail.location);
    this.description.set(detail.description);

    // Backend tarihi tek metin olarak gönderiyor ("2026-10-20T09:30:00Z").
    // Form tarihi ve saati ayrı tutuyor, ikiye bölüyoruz.
    const start = new Date(detail.startDate);
    const end = new Date(detail.endDate);

    this.startDate.set(start);
    this.startTime.set(this.timeFromDate(start));
    this.endDate.set(end);
    this.endTime.set(this.timeFromDate(end));
    this.endMinDate.set(start);

    /*
    Dış eğitmen bilgileri. Backend isExternalInstructor alanıyla
    doğrudan söylüyor — isim karşılaştırarak tahmin yürütmüyoruz.

    Doldurulması KRİTİK: PUT isteği gelen değeri koşulsuz yazıyor.
    Doldurmazsak kullanıcı sadece başlığı değiştirip kaydettiğinde
    dış eğitmen bilgileri sessizce silinir.
    */
    this.isExternal.set(detail.isExternalInstructor);
    if (detail.isExternalInstructor) {
      this.externalName.set(detail.instructorName);
      this.externalEmail.set(detail.instructorEmail ?? '');
      this.externalOrganization.set(detail.instructorAffiliation ?? '');
    }

    // Backend hesaplanmış durumu gönderiyor (Ongoing/Completed
    // olabilir). Listede bu ikisi yok; iptal değilse açık sayıyoruz.
    this.status.set(detail.status === 'Cancelled' ? 'Cancelled' : 'OpenForApplication');
  }

  // Date nesnesinden "09:30" biçiminde saat çıkarır.
  private timeFromDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }




    submit(): void {
      // Doğrulama geçmezse istek hiç gönderilmiyor.
      if (!this.validate()) {
        this.messageService.add({
          severity: 'error',
          summary: 'Please fix the errors in the form.',
          life: 3000
        });
        return;
      }

      this.saving.set(true);

      const request: TrainingRequest = {
        title: this.title().trim(),
        description: this.description().trim(),
        // toLocalIso: tarayıcının saat diliminde gönderiyoruz.
        startDate: this.toLocalIso(this.buildDateTime(this.startDate(), this.startTime())!),
        endDate: this.toLocalIso(this.buildDateTime(this.endDate(), this.endTime())!),
        location: this.location().trim(),
        category: this.category()!,
        capacity: this.capacity()!,
        // Dış eğitmen seçili değilse null gönderiyoruz.
        // Ekranda kendi bilgilerimiz görünüyor ama onları göndermiyoruz:
        // ExternalInstructorName dolu olursa backend eğitimi
        // "dış eğitmenli" sayar ve kayıt yanlış olur.
        externalInstructorName: this.isExternal() ? this.externalName().trim() : null,
        externalInstructorEmail: this.isExternal() ? this.externalEmail().trim() : null,
        externalInstructorOrganization: this.isExternal() ? this.externalOrganization().trim() : null
      };

      if (this.isEditMode()) {
        // Davet kimlikleri EKLENMİYOR: PUT bu alanı tanımıyor.
        this.sendUpdate(request);
      } else {
        // Davet kimlikleri sadece oluşturmada gönderiliyor.
        // Kimse seçilmediyse boş dizi gidiyor, backend hiç bildirim yazmıyor.
        this.sendCreate({ ...request, inviteUserIds: this.inviteUserIds() });
      }
    }

    private sendCreate(request: TrainingRequest): void {
      this.trainingService.createTraining(request).subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Training created.',
            life: 3000
          });
          this.router.navigate(['/trainings']);
        },
        error: (err) => {
          console.error('Create error:', err);
          this.saving.set(false);
          this.messageService.add({
            severity: 'error',
            summary: 'Could not create training.',
            life: 4000
          });
        }
      });
    }

    private sendUpdate(request: TrainingRequest): void {
      // Create isteğinin üstüne status ekliyoruz — PUT bunu zorunlu tutuyor.
      const updateRequest: TrainingUpdateRequest = { ...request, status: this.status() };

      this.trainingService.updateTraining(this.editingId()!, updateRequest).subscribe({
        next: () => {
          this.saving.set(false);
          this.messageService.add({
            severity: 'success',
            summary: 'Training updated.',
            life: 3000
          });
          this.router.navigate(['/trainings']);
        },
        error: (err) => {
          console.error('Update error:', err);
          this.saving.set(false);
          // 403: backend sahiplik kontrolü reddetti. Başkasının
          // eğitimini düzenlemeye çalışıyor demektir.
          const message = err.status === 403
            ? 'You can only edit trainings you created.'
            : 'Could not update training.';
          this.messageService.add({ severity: 'error', summary: message, life: 4000 });
        }
      });
  }

  /*
  Date nesnesini "2026-10-20T09:30:00+03:00" biçimine çevirir.

  Hazır toISOString() kullanmıyoruz çünkü o saati UTC'ye çevirip
  yazıyor — ekranda 09:30 seçilmişken sunucuya 06:30 giderdi.

  Sonuna saat dilimi farkını ekliyoruz. Bu şart: veritabanındaki
  tarih sütunları "timestamp with time zone" tipinde ve Npgsql
  saat dilimi bilgisi olmayan tarihleri kabul etmiyor.
  */
  private toLocalIso(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');

    // getTimezoneOffset dakika cinsinden ve ters işaretli:
    // Türkiye (UTC+3) için -180 döndürüyor.
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const absMinutes = Math.abs(offsetMinutes);
    const offset = `${sign}${pad(Math.floor(absMinutes / 60))}:${pad(absMinutes % 60)}`;

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
      + `T${pad(date.getHours())}:${pad(date.getMinutes())}:00${offset}`;
  }


  /*
  Saat kutusundan çıkınca çalışır. Yazılanı düzeltir:
    9      -> 09:00
    9.30   -> 09:30
    9:30   -> 09:30
    930    -> 09:30
    0930   -> 09:30
  Geçersizse kutuyu boşaltır; alanın kırmızı görünmesini
  doğrulama adımında ekleyeceğiz.
  */
  normalizeTime(raw: string): string {
    // Rakam dışındaki her şeyi at. Nokta, iki nokta, boşluk —
    // hepsi ayraç sayılıyor, hangisini kullandığı önemli değil.
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 0) return '';

    let hours: number;
    let minutes: number;

    if (digits.length <= 2) {
      // Sadece saat yazılmış: "9" veya "09"
      hours = parseInt(digits, 10);
      minutes = 0;
    } else if (digits.length === 3) {
      // "930" -> 9 saat 30 dakika
      hours = parseInt(digits.substring(0, 1), 10);
      minutes = parseInt(digits.substring(1), 10);
    } else {
      // "0930" veya daha uzun -> ilk iki hane saat, sonraki iki hane dakika
      hours = parseInt(digits.substring(0, 2), 10);
      minutes = parseInt(digits.substring(2, 4), 10);
    }

    // Geçersiz saat ya da dakika: boş döndür, kullanıcı tekrar yazsın.
    if (hours > 23 || minutes > 59) return '';

    // padStart: tek haneli sayının başına 0 koyuyor. 9 -> "09"
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

    // Saat kutularının hata durumu. Boş metin = hata yok.
  startTimeError = signal('');
  endTimeError = signal('');

  onStartTimeBlur(raw: string): void {
    // Kutu hiç doldurulmadıysa hata değil — zorunlu alan kontrolü
    // kaydetme sırasında ayrıca yapılacak.
    if (raw.trim() === '') {
      this.startTime.set('');
      this.startTimeError.set('');
      return;
    }

    const normalized = this.normalizeTime(raw);
    this.startTime.set(normalized);
    this.startTimeError.set(normalized === '' ? 'Invalid time' : '');
  }

  onEndTimeBlur(raw: string): void {
    if (raw.trim() === '') {
      this.endTime.set('');
      this.endTimeError.set('');
      return;
    }

    const normalized = this.normalizeTime(raw);
    this.endTime.set(normalized);
    this.endTimeError.set(normalized === '' ? 'Invalid time' : '');
  }

  // Her alanın hata mesajı. Boş metin = hata yok.
  // Alan adıyla eşleşen ayrı signal'lar tutuyoruz ki hata
  // mesajı kendi kutusunun altında görünsün.
  errors = signal<Record<string, string>>({});

  // Formu kontrol eder. Hata varsa errors'ı doldurur ve false döner.
  validate(): boolean {
    const found: Record<string, string> = {};

    if (this.title().trim() === '') {
      found['title'] = 'Title is required.';
    }
    if (this.category() === null) {
      found['category'] = 'Category is required.';
    }
    // Kapasite hem boş hem de 0/negatif olabilir — ikisi de geçersiz.
    // Backend 1-1000 aralığını zorunlu tutuyor, aynı sınırı burada da uyguluyoruz.
    const cap = this.capacity();
    if (cap === null || cap < 1) {
      found['capacity'] = 'Capacity must be at least 1.';
    } else if (cap > 1000) {
      found['capacity'] = 'Capacity cannot exceed 1000.';
    }
    if (this.location().trim() === '') {
      found['location'] = 'Location is required.';
    }
    if (this.description().trim() === '') {
      found['description'] = 'Description is required.';
    }
    if (this.startDate() === null) {
      found['startDate'] = 'Start date is required.';
    }
    if (this.startTime() === '') {
      found['startTime'] = 'Start time is required.';
    }
    if (this.endDate() === null) {
      found['endDate'] = 'End date is required.';
    }
    if (this.endTime() === '') {
      found['endTime'] = 'End time is required.';
    }

    /*
    Davet listesi BİLİNÇLİ olarak doğrulanmıyor — zorunlu değil.
    Boş bırakılabilir, o zaman kimseye davet gitmez.
    */

    // Dış eğitmen seçiliyse üç alan da zorunlu.
    // Ad özellikle kritik: backend "ExternalInstructorName doluysa
    // bu eğitim dış eğitmenlidir" kuralıyla çalışıyor.
    if (this.isExternal()) {
      if (this.externalName().trim() === '') {
        found['externalName'] = 'Instructor name is required.';
      }
      if (this.externalEmail().trim() === '') {
        found['externalEmail'] = 'Email is required.';
      }
      if (this.externalOrganization().trim() === '') {
        found['externalOrganization'] = 'Organization is required.';
      }
    }

    // Bitiş, başlangıçtan sonra olmalı. Takvim aynı günü seçmeye
    // izin veriyor, o yüzden saatleri de hesaba katmamız gerek —
    // 17:00 başlayıp 09:00 biten bir eğitim kaydedilebilirdi.
    const start = this.buildDateTime(this.startDate(), this.startTime());
    const end = this.buildDateTime(this.endDate(), this.endTime());
    if (start !== null && end !== null && end <= start) {
      found['endTime'] = 'End must be after start.';
    }

    this.errors.set(found);
    return Object.keys(found).length === 0;
  }

  // Takvimden gelen tarihle elle yazılan saati birleştirir.
  // Backend tek bir alan bekliyor: "2026-10-05T09:00:00"
  buildDateTime(date: Date | null, time: string): Date | null {
    if (date === null || time === '') return null;

    const [hours, minutes] = time.split(':').map(Number);
    // Yeni bir Date üretiyoruz; takvimden geleni değiştirmiyoruz.
    // Date nesneleri değiştirilebilir olduğu için doğrudan
    // setHours çağırsaydık takvimdeki seçim de kayardı.
    const combined = new Date(date);
    combined.setHours(hours, minutes, 0, 0);
    return combined;
  }

    /*
  Clear düğmesi. Oluşturmada alanları boşaltıyor,
  düzenlemede kayıttaki değerlere geri dönüyor —
  "yaptığım değişiklikleri geri al" anlamında.
  */
  clearForm(): void {
    this.errors.set({});
    this.startTimeError.set('');
    this.endTimeError.set('');

    if (this.loadedDetail !== null) {
      this.fillForm(this.loadedDetail);
      return;
    }

    this.title.set('');
    this.category.set(null);
    this.capacity.set(null);
    this.location.set('');
    this.description.set('');
    this.startDate.set(null);
    this.startTime.set('');
    this.endDate.set(null);
    this.endTime.set('');
    this.endMinDate.set(new Date());
    this.isExternal.set(false);
    this.externalName.set('');
    this.externalEmail.set('');
    this.externalOrganization.set('');
    this.status.set('OpenForApplication');
    // Seçilen davetliler de sıfırlanıyor. Bu satır olmasa Clear'dan
    // sonra görünmeyen bir seçim kalırdı ve kaydedince davet giderdi.
    this.inviteUserIds.set([]);
  }

}