 import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/*
 Identity'nin varsayılan şifre kurallarını kontrol eder.
 Tek bir alana (control) bağlanır.
*/
export const strongPasswordValidator: ValidatorFn = (
  control: AbstractControl
):ValidationErrors | null => {

  const value: string = control.value;

  // alan boşsa hata üretme; boşluk kontrolü required'ın işi
  if (!value) {
    return null;
  }

  const errors: ValidationErrors = {};

  // Şifre kurallarını kontrol et
  //üm hataları biriktiriyoruz, kullanıcıya tüm hataları bir kerede göstericeğiz
  if (value.length < 6) errors['minLength'] = true;
  if (!/[A-Z]/.test(value)) errors['uppercase'] = true;
  if (!/[a-z]/.test(value)) errors['lowercase'] = true;
  if (!/[0-9]/.test(value)) errors['digit'] = true;
  if (!/[^a-zA-Z0-9]/.test(value)) errors['special'] = true;

  // Hiç hata yoksa null döndür (null = geçerli)
  return Object.keys(errors).length > 0 ? errors : null;
};

/*
 password ve confirmPassword alanlarının eşleştiğini kontrol eder.
 Tek bir alana değil, onları kapsayan FormGroup'a bağlanır.
*/
export const passwordMatchValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;

  // İkisi de dolmadan karşılaştırma yapma
  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { passwordMismatch: true };
};