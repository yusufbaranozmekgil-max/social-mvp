import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { PostService } from '../../../core/services/post.service';
import { User } from '../../../core/models/user.model';
import { Post } from '../../../core/models/post.model';
import { PostCardComponent } from '../../../shared/components/post-card/post-card.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule, FormsModule, PostCardComponent],
  templateUrl: './profile-page.component.html',
  styleUrls: ['./profile-page.component.css']
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private auth = inject(AuthService);
  private userService = inject(UserService);
  private postService = inject(PostService);

  user: User | null = null;
  posts: Post[] = [];
  notFound = false;

  editing = false;
  editBio = '';
  editPhotoUrl = '';

  followerCount = 0;
  followingCount = 0;
  isFollowing = false;

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
    this.isFollowing = me
      ? this.userService.isFollowing(me, this.user.username)
      : false;
  }

  startEdit(): void {
    if (!this.user) return;
    this.editBio = this.user.bio;
    this.editPhotoUrl = this.user.profilePhotoUrl;
    this.editing = true;
  }

  cancelEdit(): void {
    this.editing = false;
  }

  saveEdit(): void {
    if (!this.user) return;
    const updated = this.userService.updateProfile(this.user.username, {
      bio: this.editBio.trim(),
      profilePhotoUrl: this.editPhotoUrl.trim()
    });
    if (updated) {
      this.user = updated;
      this.editing = false;
    }
  }

  toggleFollow(): void {
    const me = this.auth.currentUser?.username;
    if (!me || !this.user) return;
    this.userService.toggleFollow(me, this.user.username);
    this.refreshFollowState();
  }
}
