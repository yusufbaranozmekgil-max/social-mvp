import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { PostService } from '../../../core/services/post.service';
import { Post } from '../../../core/models/post.model';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.css']
})
export class PostCardComponent {
  private auth = inject(AuthService);
  private postService = inject(PostService);

  @Input({ required: true }) post!: Post;

  commentText = '';

  get currentUsername(): string {
    return this.auth.currentUser?.username ?? '';
  }

  get isLiked(): boolean {
    return this.post.likes.includes(this.currentUsername);
  }

  toggleLike(): void {
    if (!this.currentUsername) return;
    const updated = this.postService.toggleLike(this.post.id, this.currentUsername);
    if (updated) {
      this.post = { ...updated };
    }
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
    }

    this.commentText = '';
  }
}
