import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Message } from 'primeng/message';
import { AuthService } from '../../../core/services/auth.service';
import {
  strongPasswordValidator,
  passwordMatchValidator
} from '../../../core/validators/password.validators';

@Component({
  selector: 'app-register',
  //Standalone bileşende, şablonda kullanacağın her şey burada yazılı olmalı
  imports: [ReactiveFormsModule, RouterLink, Button, InputText, Password, Message],
  templateUrl: './register.html'
})
export class Register {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  //Signal değişince Angular şablonu otomatik güncelliyor
  loading = signal(false);
  errorMessage = signal('');

  registerForm = this.fb.group(
    {
      //password alanının kendi listesinde, çünkü tek alanla ilgileniyor
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      department: [''],
      password: ['', [Validators.required, strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]]
    },
    // Grup seviyesindeki validator ikinci parametreye yazılır
    { validators: passwordMatchValidator }
  );

  onSubmit(): void {
    // Form geçersizse istek atma, sadece hataları görünür yap
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched(); 
      return;
    }

    this.loading.set(true);
    this.errorMessage.set('');

    /*registerForm.value yerine bunu kullanıyorum.
    value, devre dışı bırakılmış (disabled) alanları atlar; getRawValue() hepsini verir */
    const { fullName, email, password, department } = this.registerForm.getRawValue();

    this.authService
      .register({
        fullName: fullName!,
        email: email!,
        password: password!,
        department: department!
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          // Kayıt başarılı, giriş sayfasına gönder
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading.set(false);
          if (err.status === 400) {
            this.errorMessage.set('This email may already be registered. Please try another one.');
          } else {
            this.errorMessage.set('Something went wrong. Please try again.');
          }
        }
      });
  }
}