import { Component, computed, inject } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

import {MenuItem} from 'primeng/api';
import {Avatar} from 'primeng/avatar';
import {Menu} from 'primeng/menu';
import {InputText} from 'primeng/inputtext';
import {AuthService} from '../core/services/auth.service';

import { NotificationBell } from './notification-bell/notification-bell';

@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Avatar, Menu, InputText, NotificationBell],
  templateUrl: './layout.html',
  styleUrl: './layout.scss'
})
export class Layout {
  private authService = inject(AuthService);
  private router = inject(Router);


  //servisteki signal'ı doğrudan kullanmaıcaz
  currentUser = this.authService.currentUser;

  //baş hqrfleri koyma
  initials = computed(() => {
    const name = this.currentUser()?.fullName ?? '';
    return name
      .trim()
      .split(/\s+/)             //boşluklara göre parçalama
      .filter(part => part)     //boş parçaları at
      .slice(0, 2)              //en fazla iki kelime
      .map((part) => part[0])   //her kelime baş harfini al
      .join('')
      .toUpperCase();
  });


  // Menü maddesinin şekli
  // roles: bu maddeyi hangi roller görebilir. Boş dizi = herkes.
  private allNavItems = [
    { label: 'Dashboard',        icon: 'pi pi-home',       route: '/dashboard',         roles: [] as string[], section: 'main' },
    { label: 'My Trainings',     icon: 'pi pi-book',       route: '/my-applications',   roles: ['Employee', 'Instructor'], section: 'main' },
    { label: 'My Certificates',  icon: 'pi pi-verified',   route: '/my-certificates',   roles: ['Employee', 'Instructor'], section: 'main' },
    { label: 'Training Catalog', icon: 'pi pi-th-large',   route: '/trainings',         roles: [] as string[], section: 'main' },
    { label: 'Create Training',  icon: 'pi pi-plus-circle', route: '/trainings/create', roles: ['Instructor', 'HRManager'], section: 'main' },
    // Approvals'ın yerini aldı. Instructor kendi eğitimlerini, HR hepsini görüyor.
    { label: 'Participants',     icon: 'pi pi-users',       route: '/participants',     roles: ['Instructor', 'HRManager'], section: 'management' }
  ];

  // Kullanıcının rolüne göre ana menü
  mainNavItems = computed(() =>
    this.allNavItems.filter(
      item => item.section === 'main' && this.canSee(item.roles)
    )
  );

  // Ayraç altındaki yönetim bölümü
  managementNavItems = computed(() =>
    this.allNavItems.filter(
      item => item.section === 'management' && this.canSee(item.roles)
    )
  );

  private canSee(roles: string[]): boolean {
    // Rol listesi boşsa madde herkese açık
    if (roles.length === 0) {
      return true;
    }
    const userRole = this.currentUser()?.role;
    return !!userRole && roles.includes(userRole);
  }


  userMenuItems: MenuItem[] = [
    {
      label: 'Settings',
      icon: 'pi pi-cog',
      command: () => this.openSettings()
    },
    { separator: true },
    {
      label: 'Sign Out',
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ];

  openSettings(): void{
    //settings sayfası henüz yok
  }
  
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}