import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';

const USERS_KEY = 'users';

@Injectable({ providedIn: 'root' })
export class UserService {
  private storage = inject(StorageService);
  private auth = inject(AuthService);

  getByUsername(username: string): User | null {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    return users.find(u => u.username === username) ?? null;
  }

  updateProfile(
    username: string,
    changes: { bio?: string; profilePhotoUrl?: string }
  ): User | null {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return null;

    const updated: User = { ...users[idx], ...changes };
    users[idx] = updated;
    this.storage.set(USERS_KEY, users);

    if (this.auth.currentUser?.username === username) {
      this.auth.syncCurrentUser(updated);
    }
    return updated;
  }

  isFollowing(currentUsername: string, targetUsername: string): boolean {
    const user = this.getByUsername(currentUsername);
    return user?.following?.includes(targetUsername) ?? false;
  }

  toggleFollow(currentUsername: string, targetUsername: string): User | null {
    if (!currentUsername || currentUsername === targetUsername) return null;

    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === currentUsername);
    if (idx === -1) return null;

    const current = users[idx];
    const following = current.following ?? [];
    const pos = following.indexOf(targetUsername);
    const newFollowing =
      pos === -1
        ? [...following, targetUsername]
        : following.filter(u => u !== targetUsername);

    const updated: User = { ...current, following: newFollowing };
    users[idx] = updated;
    this.storage.set(USERS_KEY, users);

    if (this.auth.currentUser?.username === currentUsername) {
      this.auth.syncCurrentUser(updated);
    }
    return updated;
  }

  getFollowerCount(username: string): number {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    return users.filter(u => (u.following ?? []).includes(username)).length;
  }

  getFollowingCount(username: string): number {
    const user = this.getByUsername(username);
    return user?.following?.length ?? 0;
  }
}
