import { Component } from '@angular/core';

/*
Gecici sayfa. Sertifika ozelligi tamamlanmadi; rota bos bir
bilesene ya da yanlis bir sayfaya gitmesin diye burasi duruyor.
Sablon ve stil dosya icinde - birkac satirlik icerik icin ayri
iki dosya acmaya deger degil.
*/
@Component({
  selector: 'app-my-certificates',
  template: `
    <div class="placeholder-page">
      <p class="breadcrumb">My Certificates</p>

      <div class="placeholder-box">
        <i class="pi pi-verified"></i>
        <p class="placeholder-title">This feature is under development.</p>
        <p class="placeholder-text">
          Certificates for completed trainings will be available here.
        </p>
      </div>
    </div>
  `,
  styles: `
    .placeholder-page {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .breadcrumb {
      margin: 0;
      font-size: 0.85rem;
      color: var(--p-text-muted-color);
    }

    .placeholder-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      padding: 4rem 1.5rem;
      background: var(--p-surface-800);
      border: 1px solid var(--p-surface-700);
      border-radius: 12px;
      text-align: center;
    }

    .placeholder-box i {
      font-size: 1.8rem;
      color: var(--p-text-muted-color);
    }

    .placeholder-title {
      margin: 0;
      font-size: 1rem;
      color: var(--p-text-color);
    }

    .placeholder-text {
      margin: 0;
      font-size: 0.85rem;
      color: var(--p-text-muted-color);
    }
  `
})
export class MyCertificates {}