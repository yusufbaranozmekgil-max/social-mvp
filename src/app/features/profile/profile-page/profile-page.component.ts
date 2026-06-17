import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { PostService } from '../../../core/services/post.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { User } from '../../../core/models/user.model';
import { Post } from '../../../core/models/post.model';
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';
import { FormattedTextComponent } from '../../../shared/components/formatted-text/formatted-text.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PostCardComponent, FormattedTextComponent],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.scss']
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private postService = inject(PostService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  readonly pageSize = 12;

  user: User | null = null;
  posts: Post[] = [];
  postLimit = this.pageSize;
  notFound = false;

  get visiblePosts(): Post[] {
    return this.posts.slice(0, this.postLimit);
  }

  get hasMorePosts(): boolean {
    return this.posts.length > this.postLimit;
  }

  loadMorePosts(): void {
    this.postLimit += this.pageSize;
  }

  editing = false;
  editBio = '';
  editPhotoUrl = '';

  followerCount = 0;
  followingCount = 0;
  isFollowing = false;
  hasPendingRequest = false;

  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.route.paramMap.subscribe(params => {
      const username = params.get('username') ?? '';
      this.load(username);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  get isOwnProfile(): boolean {
    return !!this.user && this.auth.currentUser?.username === this.user.username;
  }

  private load(username: string): void {
    this.editing = false;
    this.postLimit = this.pageSize;
    const found = this.userService.getByUsername(username);
    if (!found) {
      this.user = null;
      this.posts = [];
      this.notFound = true;
      return;
    }
    this.notFound = false;
    this.user = found;
    this.posts = this.postService.getByUsername(username);
    this.refreshFollowState();
  }

  private refreshFollowState(): void {
    if (!this.user) return;
    this.followerCount = this.userService.getFollowerCount(this.user.username);
    this.followingCount = this.userService.getFollowingCount(this.user.username);

    const me = this.auth.currentUser?.username;
    if (me) {
      this.isFollowing = this.userService.isFollowing(me, this.user.username);
      this.hasPendingRequest = this.userService.hasPendingRequest(me, this.user.username);
    } else {
      this.isFollowing = false;
      this.hasPendingRequest = false;
    }
  }

  startEdit(): void {
    if (!this.user) return;
    this.editBio = this.user.bio;
    this.editPhotoUrl = this.user.profilePhotoUrl;
    this.editing = true;
  }

  async cancelEdit(): Promise<void> {
    const ok = await this.confirm.ask(
      'Düzenlemeyi iptal et',
      'Kaydetmeden çıkmak istediğine emin misin? Yaptığın değişiklikler kaybolacak.',
      { confirmText: 'Evet, çık', danger: true }
    );
    if (!ok) return;
    this.editing = false;
  }

  async saveEdit(): Promise<void> {
    if (!this.user) return;
    const ok = await this.confirm.ask(
      'Profili güncelle',
      'Yeni bilgileri kaydetmek istediğine emin misin?',
      { confirmText: 'Kaydet' }
    );
    if (!ok) return;
    const updated = this.userService.updateProfile(this.user.username, {
      bio: this.editBio.trim(),
      profilePhotoUrl: this.editPhotoUrl.trim()
    });
    if (updated) {
      this.user = updated;
      this.editing = false;
      this.toast.success('Profil güncellendi');
    }
  }

  async clearBio(): Promise<void> {
    if (!this.user) return;
    const ok = await this.confirm.ask(
      'Bio\'yu sil',
      'Bio bilgini silmek istediğine emin misin?',
      { confirmText: 'Sil', danger: true }
    );
    if (!ok) return;
    this.editBio = '';
    const updated = this.userService.updateProfile(this.user.username, { bio: '' });
    if (updated) {
      this.user = updated;
      this.toast.success('Bio silindi');
    }
  }

  async clearPhoto(): Promise<void> {
    if (!this.user) return;
    const ok = await this.confirm.ask(
      'Profil fotoğrafını sil',
      'Profil fotoğrafını silmek istediğine emin misin?',
      { confirmText: 'Sil', danger: true }
    );
    if (!ok) return;
    this.editPhotoUrl = '';
    const updated = this.userService.updateProfile(this.user.username, { profilePhotoUrl: '' });
    if (updated) {
      this.user = updated;
      this.toast.success('Profil fotoğrafı silindi');
    }
  }

  onPostDeleted(postId: string): void {
    this.posts = this.posts.filter(p => p.id !== postId);
  }

  async followAction(): Promise<void> {
    const me = this.auth.currentUser?.username;
    if (!me || !this.user) return;

    if (this.isFollowing) {
      const ok = await this.confirm.ask(
        'Takibi bırak',
        '@' + this.user.username + ' kullanıcısını takipten çıkmak istediğine emin misin?',
        { confirmText: 'Evet', danger: true }
      );
      if (!ok) return;
      this.userService.unfollow(me, this.user.username);
      this.toast.info('Takipten çıkıldı');
    } else if (this.hasPendingRequest) {
      const ok = await this.confirm.ask(
        'İsteği iptal et',
        'Takip isteğini geri almak istediğine emin misin?',
        { confirmText: 'Evet, iptal et', danger: true }
      );
      if (!ok) return;
      this.userService.cancelFollowRequest(me, this.user.username);
      this.toast.info('Takip isteği iptal edildi');
    } else if (this.user.isPrivate) {
      this.userService.requestFollow(me, this.user.username);
      this.toast.success('Takip isteği gönderildi');
    } else {
      this.userService.followInstantly(me, this.user.username);
      this.userService.pushNotification(this.user.username, 'follow_accepted', me);
      this.toast.success('Takip ediliyor');
    }
    this.refreshFollowState();
  }

  get canSeeContent(): boolean {
    if (!this.user) return false;
    if (this.isOwnProfile) return true;
    if (!this.user.isPrivate) return true;
    return this.isFollowing;
  }
}
