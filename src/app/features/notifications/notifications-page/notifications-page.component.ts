import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NaturalTimePipe } from '../../../shared/pipes/natural-time.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { AppNotification } from '../../../core/models/notification.model';
import { User } from '../../../core/models/user.model';

@Component({
  selector: 'app-notifications-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NaturalTimePipe],
  templateUrl: './notifications-page.component.html',
  styleUrls: ['./notifications-page.component.scss']
})
export class NotificationsPageComponent implements OnInit {
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly pageSize = 12;

  user: User | null = null;
  pendingRequests: string[] = [];
  notifications: AppNotification[] = [];

  requestLimit = this.pageSize;
  notifLimit = this.pageSize;

  get visibleRequests(): string[] {
    return this.pendingRequests.slice(0, this.requestLimit);
  }

  get visibleNotifications(): AppNotification[] {
    return this.notifications.slice(0, this.notifLimit);
  }

  get hasMoreRequests(): boolean {
    return this.pendingRequests.length > this.requestLimit;
  }

  get hasMoreNotifications(): boolean {
    return this.notifications.length > this.notifLimit;
  }

  loadMoreRequests(): void {
    this.requestLimit += this.pageSize;
  }

  loadMoreNotifications(): void {
    this.notifLimit += this.pageSize;
  }

  ngOnInit(): void {
    this.refresh();
    if (this.user) this.userService.markAllNotificationsRead(this.user.username);
  }

  private refresh(): void {
    const me = this.auth.currentUser;
    if (!me) return;
    const fresh = this.userService.getByUsername(me.username);
    this.user = fresh;
    this.pendingRequests = fresh?.followRequests ?? [];
    this.notifications = (fresh?.notifications ?? [])
      .filter(n => n.type !== 'follow_request')
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  accept(requester: string): void {
    const me = this.auth.currentUser?.username;
    if (!me) return;
    this.userService.acceptFollowRequest(me, requester);
    this.toast.success('@' + requester + ' takip etmeye başladı');
    this.refresh();
  }

  reject(requester: string): void {
    const me = this.auth.currentUser?.username;
    if (!me) return;
    this.userService.rejectFollowRequest(me, requester);
    this.toast.info('İstek reddedildi');
    this.refresh();
  }

  remove(event: Event, notifId: string): void {
    event.preventDefault();
    event.stopPropagation();
    const me = this.auth.currentUser?.username;
    if (!me) return;
    this.userService.removeNotification(me, notifId);
    this.refresh();
  }

  async clearAll(): Promise<void> {
    const me = this.auth.currentUser?.username;
    if (!me) return;
    const ok = await this.confirm.ask(
      'Bildirimleri Temizle',
      'Tüm bildirimleri silmek istediğine emin misin? Takip istekleri etkilenmez.',
      { confirmText: 'Temizle', danger: true }
    );
    if (!ok) return;
    this.userService.clearAllNotifications(me);
    this.toast.success('Bildirimler temizlendi');
    this.refresh();
  }

  iconFor(type: string): string {
    switch (type) {
      case 'like': return 'favorite';
      case 'comment': return 'chat_bubble';
      case 'follow_accepted': return 'how_to_reg';
      default: return 'notifications';
    }
  }

  textFor(n: AppNotification): string {
    switch (n.type) {
      case 'like': return 'gönderini beğendi';
      case 'comment': return 'gönderine yorum yaptı';
      case 'follow_accepted': return 'takip isteğini kabul etti';
      default: return '';
    }
  }
}
