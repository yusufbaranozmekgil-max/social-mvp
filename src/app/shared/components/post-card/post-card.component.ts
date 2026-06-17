import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PostService } from '../../../core/services/post.service';
import { UserService } from '../../../core/services/user.service';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ToastService } from '../../../core/services/toast.service';
import { Post } from '../../../core/models/post.model';
import { FormattedTextComponent } from '../formatted-text/formatted-text.component';
import { MentionInputComponent } from '../mention-input/mention-input.component';
import { NaturalTimePipe } from '../../pipes/natural-time.pipe';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, FormattedTextComponent, MentionInputComponent, NaturalTimePipe],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss']
})
export class PostCardComponent {
  private auth = inject(AuthService);
  private postService = inject(PostService);
  private userService = inject(UserService);
  private confirm = inject(ConfirmService);
  private toast = inject(ToastService);

  @Input({ required: true }) post!: Post;
  @Output() postDeleted = new EventEmitter<string>();
  @ViewChild('carousel') carouselRef?: ElementRef<HTMLDivElement>;

  readonly maxCommentChars = 280;
  readonly maxPostChars = 280;
  readonly maxPhotos = PostService.MAX_PHOTOS;

  commentText = '';
  activeSlide = 0;

  menuOpen = false;
  editing = false;
  editContent = '';
  editPhotoUrls: string[] = [];
  editDraftPhotoUrl = '';

  editingCommentId: string | null = null;
  editingCommentText = '';

  get currentUsername(): string {
    return this.auth.currentUser?.username ?? '';
  }

  get isOwner(): boolean {
    return !!this.currentUsername && this.post.authorUsername === this.currentUsername;
  }

  get isLiked(): boolean {
    return this.post.likes.includes(this.currentUsername);
  }

  get isBookmarked(): boolean {
    return this.userService.isBookmarked(this.currentUsername, this.post.id);
  }

  get photos(): string[] {
    if (this.post.photoUrls?.length) return this.post.photoUrls;
    if (this.post.photoUrl) return [this.post.photoUrl];
    return [];
  }

  get commentRemaining(): number {
    return this.maxCommentChars - this.commentText.length;
  }

  get editPostRemaining(): number {
    return this.maxPostChars - this.editContent.length;
  }

  isCommentOwner(authorUsername: string): boolean {
    return !!this.currentUsername && authorUsername === this.currentUsername;
  }

  toggleLike(): void {
    if (!this.currentUsername) return;
    const updated = this.postService.toggleLike(this.post.id, this.currentUsername);
    if (updated) this.post = { ...updated };
  }

  toggleBookmark(): void {
    if (!this.currentUsername) return;
    const wasBookmarked = this.isBookmarked;
    this.userService.toggleBookmark(this.currentUsername, this.post.id);
    this.toast.success(wasBookmarked ? 'Kayıt kaldırıldı' : 'Kaydedildi');
  }

  submitComment(): void {
    const text = this.commentText.trim();
    if (!text || !this.currentUsername) return;

    const comment = this.postService.addComment(this.post.id, this.currentUsername, text);
    if (comment) {
      this.post = {
        ...this.post,
        comments: [...this.post.comments, comment]
      };
      this.toast.success('Yorum eklendi');
    }
    this.commentText = '';
  }

  toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen = !this.menuOpen;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen) return;
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-wrap')) {
      this.menuOpen = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen) this.menuOpen = false;
  }

  startEdit(): void {
    this.editContent = this.post.content;
    this.editPhotoUrls = [...this.photos];
    this.editDraftPhotoUrl = '';
    this.editing = true;
    this.menuOpen = false;
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

  addEditPhoto(): void {
    const url = this.editDraftPhotoUrl.trim();
    if (!url || this.editPhotoUrls.length >= this.maxPhotos) return;
    this.editPhotoUrls = [...this.editPhotoUrls, url];
    this.editDraftPhotoUrl = '';
  }

  removeEditPhoto(index: number): void {
    this.editPhotoUrls = this.editPhotoUrls.filter((_, i) => i !== index);
  }

  async saveEdit(): Promise<void> {
    if (!this.editContent.trim()) return;
    const ok = await this.confirm.ask(
      'Postu güncelle',
      'Değişiklikleri kaydetmek istediğine emin misin?',
      { confirmText: 'Kaydet' }
    );
    if (!ok) return;
    const updated = this.postService.updatePost(this.post.id, this.currentUsername, {
      content: this.editContent.trim(),
      photoUrls: this.editPhotoUrls
    });
    if (updated) {
      this.post = updated;
      this.editing = false;
      this.activeSlide = 0;
      this.toast.success('Post güncellendi');
    }
  }

  async deletePost(): Promise<void> {
    this.menuOpen = false;
    const ok = await this.confirm.ask(
      'Postu sil',
      'Bu postu kalıcı olarak silmek istediğine emin misin?',
      { confirmText: 'Sil', danger: true }
    );
    if (!ok) return;
    const success = this.postService.deletePost(this.post.id, this.currentUsername);
    if (success) {
      this.toast.success('Post silindi');
      this.postDeleted.emit(this.post.id);
    }
  }

  startCommentEdit(commentId: string, content: string): void {
    this.editingCommentId = commentId;
    this.editingCommentText = content;
  }

  async cancelCommentEdit(): Promise<void> {
    const ok = await this.confirm.ask(
      'Yorum düzenlemeyi iptal et',
      'Kaydetmeden çıkmak istediğine emin misin?',
      { confirmText: 'Evet, çık', danger: true }
    );
    if (!ok) return;
    this.editingCommentId = null;
    this.editingCommentText = '';
  }

  async saveCommentEdit(commentId: string): Promise<void> {
    const text = this.editingCommentText.trim();
    if (!text) return;
    const ok = await this.confirm.ask(
      'Yorumu güncelle',
      'Yorumdaki değişikliği kaydetmek istediğine emin misin?',
      { confirmText: 'Kaydet' }
    );
    if (!ok) return;
    const updated = this.postService.updateComment(
      this.post.id,
      commentId,
      this.currentUsername,
      text
    );
    if (updated) {
      this.post = {
        ...this.post,
        comments: this.post.comments.map(c =>
          c.commentId === commentId ? { ...c, content: text } : c
        )
      };
      this.editingCommentId = null;
      this.editingCommentText = '';
      this.toast.success('Yorum güncellendi');
    }
  }

  async deleteComment(commentId: string): Promise<void> {
    const ok = await this.confirm.ask(
      'Yorumu sil',
      'Bu yorumu silmek istediğine emin misin?',
      { confirmText: 'Sil', danger: true }
    );
    if (!ok) return;
    const success = this.postService.deleteComment(
      this.post.id,
      commentId,
      this.currentUsername
    );
    if (success) {
      this.post = {
        ...this.post,
        comments: this.post.comments.filter(c => c.commentId !== commentId)
      };
      this.toast.success('Yorum silindi');
    }
  }

  goToSlide(index: number): void {
    const el = this.carouselRef?.nativeElement;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' });
  }

  prevSlide(): void {
    this.goToSlide(Math.max(0, this.activeSlide - 1));
  }

  nextSlide(): void {
    this.goToSlide(Math.min(this.photos.length - 1, this.activeSlide + 1));
  }

  onCarouselScroll(): void {
    const el = this.carouselRef?.nativeElement;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    if (index !== this.activeSlide) this.activeSlide = index;
  }
}
