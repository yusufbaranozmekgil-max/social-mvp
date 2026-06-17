import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PostService } from '../../../core/services/post.service';
import { ToastService } from '../../../core/services/toast.service';
import { MentionInputComponent } from '../../../shared/components/mention-input/mention-input.component';

@Component({
  selector: 'app-new-post',
  standalone: true,
  imports: [CommonModule, FormsModule, MentionInputComponent],
  templateUrl: './new-post.component.html',
  styleUrls: ['./new-post.component.scss']
})
export class NewPostComponent {
  private auth = inject(AuthService);
  private postService = inject(PostService);
  private toast = inject(ToastService);

  @Output() postCreated = new EventEmitter<void>();

  readonly maxPhotos = PostService.MAX_PHOTOS;
  readonly maxChars = 280;

  content = '';
  photoUrls: string[] = [];
  draftPhotoUrl = '';
  error = '';
  private errorTimer?: ReturnType<typeof setTimeout>;

  get remaining(): number {
    return this.maxChars - this.content.length;
  }

  addPhoto(): void {
    const url = this.draftPhotoUrl.trim();
    if (!url) return;
    if (this.photoUrls.length >= this.maxPhotos) return;
    this.photoUrls = [...this.photoUrls, url];
    this.draftPhotoUrl = '';
  }

  removePhoto(index: number): void {
    this.photoUrls = this.photoUrls.filter((_, i) => i !== index);
  }

  submit(): void {
    const user = this.auth.currentUser;
    if (!user || !this.content.trim()) return;

    const result = this.postService.create(user.username, this.content.trim(), this.photoUrls);

    if (!result.ok) {
      this.showError(result.error);
      this.toast.error(result.error);
      return;
    }

    this.content = '';
    this.photoUrls = [];
    this.draftPhotoUrl = '';
    this.error = '';
    this.toast.success('Post paylaşıldı');
    this.postCreated.emit();
  }

  private showError(msg: string): void {
    this.error = msg;
    if (this.errorTimer) clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => (this.error = ''), 6000);
  }
}
