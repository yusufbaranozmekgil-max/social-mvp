import { Component, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private userService = inject(UserService);

  currentUser$ = this.auth.currentUser$;

  searchQuery = '';
  searchResults: User[] = [];
  showDropdown = false;

  private lastNonNotifUrl = '/feed';
  private lastNonSettingsUrl = '/feed';

  constructor() {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        const url = e.urlAfterRedirects;
        const isAuthPage = url.startsWith('/login') || url.startsWith('/register');
        if (!url.startsWith('/notifications') && !isAuthPage) {
          this.lastNonNotifUrl = url;
        }
        if (!url.startsWith('/settings') && !isAuthPage) {
          this.lastNonSettingsUrl = url;
        }
        this.closeSearch();
      });
  }

  onBellClick(): void {
    if (this.router.url.startsWith('/notifications')) {
      this.router.navigateByUrl(this.lastNonNotifUrl);
    } else {
      this.router.navigateByUrl('/notifications');
    }
  }

  onSettingsClick(): void {
    if (this.router.url.startsWith('/settings')) {
      this.router.navigateByUrl(this.lastNonSettingsUrl);
    } else {
      this.router.navigateByUrl('/settings');
    }
  }

  onSearchInput(): void {
    this.searchResults = this.userService.searchByUsername(this.searchQuery);
    this.showDropdown = true;
  }

  onSearchFocus(): void {
    if (this.searchQuery.trim()) {
      this.searchResults = this.userService.searchByUsername(this.searchQuery);
      this.showDropdown = true;
    }
  }

  selectResult(username: string): void {
    this.closeSearch();
    this.router.navigate(['/profile', username]);
  }

  closeSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.showDropdown = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.showDropdown) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.search-wrap')) {
      this.showDropdown = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showDropdown) this.closeSearch();
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  unreadCount(user: User): number {
    const unreadNotifs = (user.notifications ?? []).filter(n => !n.read).length;
    const pending = (user.followRequests ?? []).length;
    return unreadNotifs + pending;
  }
}
