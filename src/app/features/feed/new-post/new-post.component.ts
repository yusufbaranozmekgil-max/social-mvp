import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { PostService } from '../../../core/services/post.service';

@Component({
  selector: 'app-new-post',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './new-post.component.html',
  styleUrls: ['./new-post.component.css']
})
export class NewPostComponent {
  private auth = inject(AuthService);
  private postService = inject(PostService);

  @Output() postCreated = new EventEmitter<void>();

  content = '';
  photoUrl = '';

  submit(): void {
    const user = this.auth.currentUser;
    if (!user || !this.content.trim()) return;

    this.postService.create(user.username, this.content.trim(), this.photoUrl.trim());
    this.content = '';
    this.photoUrl = '';
    this.postCreated.emit();
  }
}
