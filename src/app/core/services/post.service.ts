import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { UserService } from './user.service';
import { Post } from '../models/post.model';
import { Comment } from '../models/comment.model';

const POSTS_KEY = 'posts';
const MAX_PHOTOS = 10;
const MAX_POSTS_PER_USER = 500;

@Injectable({ providedIn: 'root' })
export class PostService {
  private storage = inject(StorageService);
  private userService = inject(UserService);

  static readonly MAX_PHOTOS = MAX_PHOTOS;
  static readonly MAX_POSTS_PER_USER = MAX_POSTS_PER_USER;

  getAll(): Post[] {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    return [...posts]
      .map(p => this.normalize(p))
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getByUsername(username: string): Post[] {
    return this.getAll().filter(p => p.authorUsername === username);
  }

  getFeedFor(username: string, following: string[]): Post[] {
    const allowed = new Set([username, ...following]);
    return this.getAll().filter(p => allowed.has(p.authorUsername));
  }

  create(
    authorUsername: string,
    content: string,
    photoUrls: string[] = []
  ): { ok: true; post: Post } | { ok: false; error: string } {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];

    const userPostCount = posts.filter(p => p.authorUsername === authorUsername).length;
    if (userPostCount >= MAX_POSTS_PER_USER) {
      return {
        ok: false,
        error: `Maksimum ${MAX_POSTS_PER_USER} post sınırına ulaştın. Yeni paylaşmak için önce eski bir postu sil.`
      };
    }

    const cleaned = photoUrls
      .map(u => u.trim())
      .filter(u => u.length > 0)
      .slice(0, MAX_PHOTOS);

    const newPost: Post = {
      id: crypto.randomUUID(),
      authorUsername,
      content,
      photoUrls: cleaned,
      likes: [],
      comments: [],
      createdAt: Date.now()
    };
    posts.push(newPost);
    this.storage.set(POSTS_KEY, posts);
    return { ok: true, post: newPost };
  }

  toggleLike(postId: string, username: string): Post | null {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    const idx = post.likes.indexOf(username);
    const liked = idx === -1;
    if (liked) post.likes.push(username);
    else post.likes.splice(idx, 1);

    this.storage.set(POSTS_KEY, posts);

    if (liked) {
      this.userService.pushNotification(post.authorUsername, 'like', username, post.id);
    } else {
      this.userService.removeLikeNotification(post.authorUsername, username, post.id);
    }

    return this.normalize(post);
  }

  deletePost(postId: string, username: string): boolean {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const idx = posts.findIndex(p => p.id === postId);
    if (idx === -1) return false;
    if (posts[idx].authorUsername !== username) return false;
    posts.splice(idx, 1);
    this.storage.set(POSTS_KEY, posts);
    return true;
  }

  updatePost(
    postId: string,
    username: string,
    changes: { content?: string; photoUrls?: string[] }
  ): Post | null {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const idx = posts.findIndex(p => p.id === postId);
    if (idx === -1) return null;
    if (posts[idx].authorUsername !== username) return null;

    const next: Post = { ...posts[idx] };
    if (changes.content !== undefined) next.content = changes.content;
    if (changes.photoUrls !== undefined) {
      next.photoUrls = changes.photoUrls
        .map(u => u.trim())
        .filter(u => u.length > 0)
        .slice(0, MAX_PHOTOS);
    }
    posts[idx] = next;
    this.storage.set(POSTS_KEY, posts);
    return this.normalize(next);
  }

  deleteComment(postId: string, commentId: string, username: string): boolean {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const post = posts.find(p => p.id === postId);
    if (!post) return false;
    const cidx = post.comments.findIndex(c => c.commentId === commentId);
    if (cidx === -1) return false;
    if (post.comments[cidx].authorUsername !== username) return false;
    post.comments.splice(cidx, 1);
    this.storage.set(POSTS_KEY, posts);
    return true;
  }

  updateComment(
    postId: string,
    commentId: string,
    username: string,
    content: string
  ): Comment | null {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;
    const comment = post.comments.find(c => c.commentId === commentId);
    if (!comment || comment.authorUsername !== username) return null;
    comment.content = content;
    this.storage.set(POSTS_KEY, posts);
    return comment;
  }

  addComment(postId: string, authorUsername: string, content: string): Comment | null {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    const comment: Comment = {
      commentId: crypto.randomUUID(),
      postId,
      authorUsername,
      content,
      timestamp: Date.now()
    };
    post.comments.push(comment);
    this.storage.set(POSTS_KEY, posts);

    this.userService.pushNotification(
      post.authorUsername,
      'comment',
      authorUsername,
      post.id,
      content.slice(0, 80)
    );

    return comment;
  }

  private normalize(post: Post): Post {
    if (post.photoUrls && Array.isArray(post.photoUrls)) {
      return post;
    }
    const legacy = post.photoUrl?.trim();
    return {
      ...post,
      photoUrls: legacy ? [legacy] : []
    };
  }
}
