import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Button } from 'primeng/button';

import { Toast } from 'primeng/toast';

@Component({
  imports: [RouterOutlet, Toast],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('egitim-portali-web');
}
