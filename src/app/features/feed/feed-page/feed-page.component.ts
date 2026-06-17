import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostService } from '../../../core/services/post.service';
import { AuthService } from '../../../core/services/auth.service';
import { Post } from '../../../core/models/post.model';
import { NewPostComponent } from '../new-post/new-post.component';
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';

@Component({
  selector: 'app-feed-page',
  standalone: true,
  imports: [CommonModule, NewPostComponent, PostCardComponent],
  templateUrl: './feed-page.component.html',
  styleUrls: ['./feed-page.component.scss']
})
export class FeedPageComponent implements OnInit {
  private postService = inject(PostService);
  private auth = inject(AuthService);

  readonly pageSize = 12;
  readonly maxVisible = 50;

  posts: Post[] = [];
  limit = this.pageSize;

  get visiblePosts(): Post[] {
    return this.posts.slice(0, this.limit);
  }

  get hasMore(): boolean {
    return this.posts.length > this.limit && this.limit < this.maxVisible;
  }

  get atMax(): boolean {
    return this.limit >= this.maxVisible && this.posts.length > this.maxVisible;
  }

  ngOnInit(): void {
    this.loadPosts();
  }

  loadPosts(): void {
    const me = this.auth.currentUser;
    if (!me) {
      this.posts = [];
      return;
    }
    this.posts = this.postService.getFeedFor(me.username, me.following ?? []);
  }

  loadMore(): void {
    this.limit = Math.min(this.limit + this.pageSize, this.maxVisible);
  }

  refresh(): void {
    this.limit = this.pageSize;
    this.loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  onPostDeleted(postId: string): void {
    this.posts = this.posts.filter(p => p.id !== postId);
  }
}
