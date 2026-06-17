import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ToastService } from '../../../core/services/toast.service';
import { ThemeService, Theme } from '../../../core/services/theme.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './settings-page.component.html',
  styleUrls: ['./settings-page.component.scss']
})
export class SettingsPageComponent {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private toast = inject(ToastService);
  themeService = inject(ThemeService);

  currentUser$ = this.auth.currentUser$;

  showAccountInfo = false;

  setTheme(theme: Theme): void {
    this.themeService.set(theme);
  }

  toggleAccountInfo(): void {
    this.showAccountInfo = !this.showAccountInfo;
  }

  togglePrivacy(): void {
    const me = this.auth.currentUser;
    if (!me) return;
    const next = !(me.isPrivate ?? false);
    this.userService.setPrivacy(me.username, next);
    this.toast.success(next ? 'Hesabın artık gizli' : 'Hesabın artık herkese açık');
  }
}
