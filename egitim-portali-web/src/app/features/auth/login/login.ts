import { Component, inject, signal } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { Button } from 'primeng/button';
import { InputText } from 'primeng/inputtext';
import { Password } from 'primeng/password';
import { Message } from 'primeng/message';


import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, Button, InputText, Password, Message],
  templateUrl: './login.html'
})
export class Login {
  //Reactive Forms'u kısa yazmayı sağlıyor. fb'ye aktarıyoruz. 
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  loading = signal(false);
  errorMessage = signal<string | null>(null);

  form = this.fb.group({
    //Form alanlarını tanımlıyoruz. Validators ile alanların zorunlu olduğunu belirtiyoruz.
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  get email() {
    return this.form.controls.email;
  }

  get password() {
    return this.form.controls.password;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    //istek giderken butonu kilitleyip dönen simge göstereceğiz. Çift tıklamayı engelliyor.
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login({
      email: this.form.value.email!,
      password: this.form.value.password!
      //Observable'ın çalışmasını başlatan yer. next başarı, error hata dalı.
    }).subscribe({
      next: () => {
        this.loading.set(false);
        //guard returnUrl varsa oraya, yoksa dashboard'a yönlendiriliyor
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        const safeUrl = returnUrl?.startsWith('/') ? returnUrl : '/dashboard';
        this.router.navigateByUrl(safeUrl);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(
          err.status === 401
            ? 'Invalid email or password.'
            : 'Something went wrong. Please try again.'
        );
      }
    });
  }
}