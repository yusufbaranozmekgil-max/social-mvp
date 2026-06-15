import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { Post } from '../models/post.model';
import { Comment } from '../models/comment.model';

const POSTS_KEY = 'posts';

@Injectable({ providedIn: 'root' })
export class PostService {
  private storage = inject(StorageService);

  getAll(): Post[] {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    return [...posts].sort((a, b) => b.createdAt - a.createdAt);
  }

  getByUsername(username: string): Post[] {
    return this.getAll().filter(p => p.authorUsername === username);
  }

  create(authorUsername: string, content: string, photoUrl = ''): Post {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const newPost: Post = {
      id: crypto.randomUUID(),
      authorUsername,
      content,
      photoUrl,
      likes: [],
      comments: [],
      createdAt: Date.now()
    };
    posts.push(newPost);
    this.storage.set(POSTS_KEY, posts);
    return newPost;
  }

  toggleLike(postId: string, username: string): Post | null {
    const posts = this.storage.get<Post[]>(POSTS_KEY) ?? [];
    const post = posts.find(p => p.id === postId);
    if (!post) return null;

    const idx = post.likes.indexOf(username);
    if (idx === -1) post.likes.push(username);
    else post.likes.splice(idx, 1);

    this.storage.set(POSTS_KEY, posts);
    return post;
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
    return comment;
  }
}
