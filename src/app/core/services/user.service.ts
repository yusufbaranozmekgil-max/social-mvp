import { Injectable, inject } from '@angular/core';
import { StorageService } from './storage.service';
import { AuthService } from './auth.service';
import { User } from '../models/user.model';
import { AppNotification, NotificationType } from '../models/notification.model';

const USERS_KEY = 'users';
const MAX_NOTIFICATIONS = 20;

@Injectable({ providedIn: 'root' })
export class UserService {
  private storage = inject(StorageService);
  private auth = inject(AuthService);

  getByUsername(username: string): User | null {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const u = users.find(u => u.username === username);
    return u ? this.normalize(u) : null;
  }

  getAll(): User[] {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    return users.map(u => this.normalize(u));
  }

  updateProfile(
    username: string,
    changes: { bio?: string; profilePhotoUrl?: string }
  ): User | null {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return null;

    const updated: User = { ...this.normalize(users[idx]), ...changes };
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

  hasPendingRequest(currentUsername: string, targetUsername: string): boolean {
    const target = this.getByUsername(targetUsername);
    return target?.followRequests?.includes(currentUsername) ?? false;
  }

  requestFollow(currentUsername: string, targetUsername: string): boolean {
    if (!currentUsername || currentUsername === targetUsername) return false;
    if (this.isFollowing(currentUsername, targetUsername)) return false;
    if (this.hasPendingRequest(currentUsername, targetUsername)) return false;

    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const tIdx = users.findIndex(u => u.username === targetUsername);
    if (tIdx === -1) return false;

    const target = this.normalize(users[tIdx]);
    target.followRequests = [...target.followRequests, currentUsername];
    users[tIdx] = target;
    this.storage.set(USERS_KEY, users);
    return true;
  }

  cancelFollowRequest(currentUsername: string, targetUsername: string): boolean {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const tIdx = users.findIndex(u => u.username === targetUsername);
    if (tIdx === -1) return false;

    const target = this.normalize(users[tIdx]);
    if (!target.followRequests.includes(currentUsername)) return false;
    target.followRequests = target.followRequests.filter(u => u !== currentUsername);
    users[tIdx] = target;
    this.storage.set(USERS_KEY, users);
    return true;
  }

  acceptFollowRequest(currentUsername: string, requesterUsername: string): boolean {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const meIdx = users.findIndex(u => u.username === currentUsername);
    const reqIdx = users.findIndex(u => u.username === requesterUsername);
    if (meIdx === -1 || reqIdx === -1) return false;

    const me = this.normalize(users[meIdx]);
    if (!me.followRequests.includes(requesterUsername)) return false;
    me.followRequests = me.followRequests.filter(u => u !== requesterUsername);
    me.notifications = me.notifications.filter(
      n => !(n.type === 'follow_request' && n.fromUsername === requesterUsername)
    );

    const requester = this.normalize(users[reqIdx]);
    if (!requester.following.includes(currentUsername)) {
      requester.following = [...requester.following, currentUsername];
    }
    requester.notifications = [
      this.makeNotification('follow_accepted', currentUsername),
      ...requester.notifications
    ];

    users[meIdx] = me;
    users[reqIdx] = requester;
    this.storage.set(USERS_KEY, users);

    if (this.auth.currentUser?.username === currentUsername) {
      this.auth.syncCurrentUser(me);
    }
    return true;
  }

  rejectFollowRequest(currentUsername: string, requesterUsername: string): boolean {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const meIdx = users.findIndex(u => u.username === currentUsername);
    if (meIdx === -1) return false;

    const me = this.normalize(users[meIdx]);
    if (!me.followRequests.includes(requesterUsername)) return false;
    me.followRequests = me.followRequests.filter(u => u !== requesterUsername);
    me.notifications = me.notifications.filter(
      n => !(n.type === 'follow_request' && n.fromUsername === requesterUsername)
    );

    users[meIdx] = me;
    this.storage.set(USERS_KEY, users);

    if (this.auth.currentUser?.username === currentUsername) {
      this.auth.syncCurrentUser(me);
    }
    return true;
  }

  unfollow(currentUsername: string, targetUsername: string): boolean {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === currentUsername);
    if (idx === -1) return false;

    const me = this.normalize(users[idx]);
    if (!me.following.includes(targetUsername)) return false;
    me.following = me.following.filter(u => u !== targetUsername);
    users[idx] = me;
    this.storage.set(USERS_KEY, users);

    if (this.auth.currentUser?.username === currentUsername) {
      this.auth.syncCurrentUser(me);
    }
    return true;
  }

  pushNotification(
    toUsername: string,
    type: NotificationType,
    fromUsername: string,
    postId?: string,
    excerpt?: string
  ): void {
    if (toUsername === fromUsername) return;
    if (type === 'follow_request') return;
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === toUsername);
    if (idx === -1) return;
    const target = this.normalize(users[idx]);

    if (type === 'like' && postId) {
      target.notifications = target.notifications.filter(
        n => !(n.type === 'like' && n.fromUsername === fromUsername && n.postId === postId)
      );
    }

    target.notifications = [
      this.makeNotification(type, fromUsername, postId, excerpt),
      ...target.notifications
    ].slice(0, MAX_NOTIFICATIONS);

    users[idx] = target;
    this.storage.set(USERS_KEY, users);

    if (this.auth.currentUser?.username === toUsername) {
      this.auth.syncCurrentUser(target);
    }
  }

  removeNotification(username: string, notificationId: string): void {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return;
    const me = this.normalize(users[idx]);
    const before = me.notifications.length;
    me.notifications = me.notifications.filter(n => n.id !== notificationId);
    if (me.notifications.length === before) return;
    users[idx] = me;
    this.storage.set(USERS_KEY, users);
    if (this.auth.currentUser?.username === username) {
      this.auth.syncCurrentUser(me);
    }
  }

  clearAllNotifications(username: string): void {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return;
    const me = this.normalize(users[idx]);
    if (me.notifications.length === 0) return;
    me.notifications = [];
    users[idx] = me;
    this.storage.set(USERS_KEY, users);
    if (this.auth.currentUser?.username === username) {
      this.auth.syncCurrentUser(me);
    }
  }

  removeLikeNotification(toUsername: string, fromUsername: string, postId: string): void {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === toUsername);
    if (idx === -1) return;
    const target = this.normalize(users[idx]);
    target.notifications = target.notifications.filter(
      n => !(n.type === 'like' && n.fromUsername === fromUsername && n.postId === postId)
    );
    users[idx] = target;
    this.storage.set(USERS_KEY, users);
    if (this.auth.currentUser?.username === toUsername) {
      this.auth.syncCurrentUser(target);
    }
  }

  markAllNotificationsRead(username: string): void {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return;
    const me = this.normalize(users[idx]);
    let changed = false;
    me.notifications = me.notifications.map(n => {
      if (!n.read) { changed = true; return { ...n, read: true }; }
      return n;
    });
    if (!changed) return;
    users[idx] = me;
    this.storage.set(USERS_KEY, users);
    if (this.auth.currentUser?.username === username) {
      this.auth.syncCurrentUser(me);
    }
  }

  getMentionSuggestions(currentUsername: string, query: string, limit = 6): User[] {
    const me = this.getByUsername(currentUsername);
    if (!me) return [];
    const following = me.following ?? [];
    if (following.length === 0) return [];

    const users = this.getAll();
    const followedUsers = users.filter(u => following.includes(u.username));
    const q = query.trim().toLowerCase();

    const matches = q
      ? followedUsers.filter(u => u.username.toLowerCase().includes(q))
      : followedUsers;

    matches.sort((a, b) => {
      const aStarts = q ? (a.username.toLowerCase().startsWith(q) ? 0 : 1) : 0;
      const bStarts = q ? (b.username.toLowerCase().startsWith(q) ? 0 : 1) : 0;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.username.localeCompare(b.username);
    });

    return matches.slice(0, limit);
  }

  searchByUsername(query: string, limit = 8): User[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const users = this.getAll();
    const matches = users.filter(u => u.username.toLowerCase().includes(q));
    matches.sort((a, b) => {
      const aStarts = a.username.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.username.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.username.localeCompare(b.username);
    });
    return matches.slice(0, limit);
  }

  getFollowerCount(username: string): number {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    return users.filter(u => (u.following ?? []).includes(username)).length;
  }

  getFollowingCount(username: string): number {
    const user = this.getByUsername(username);
    return user?.following?.length ?? 0;
  }

  toggleBookmark(username: string, postId: string): User | null {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return null;
    const me = this.normalize(users[idx]);
    const already = me.bookmarks.includes(postId);
    me.bookmarks = already
      ? me.bookmarks.filter(id => id !== postId)
      : [...me.bookmarks, postId];
    users[idx] = me;
    this.storage.set(USERS_KEY, users);
    if (this.auth.currentUser?.username === username) {
      this.auth.syncCurrentUser(me);
    }
    return me;
  }

  isBookmarked(username: string, postId: string): boolean {
    const user = this.getByUsername(username);
    return user?.bookmarks?.includes(postId) ?? false;
  }

  private normalize(user: User): User {
    return {
      ...user,
      following: user.following ?? [],
      followRequests: user.followRequests ?? [],
      notifications: user.notifications ?? [],
      isPrivate: user.isPrivate ?? false,
      bookmarks: user.bookmarks ?? []
    };
  }

  setPrivacy(username: string, isPrivate: boolean): User | null {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === username);
    if (idx === -1) return null;
    const updated: User = { ...this.normalize(users[idx]), isPrivate };
    users[idx] = updated;
    this.storage.set(USERS_KEY, users);
    if (this.auth.currentUser?.username === username) {
      this.auth.syncCurrentUser(updated);
    }
    return updated;
  }

  followInstantly(currentUsername: string, targetUsername: string): boolean {
    if (!currentUsername || currentUsername === targetUsername) return false;
    if (this.isFollowing(currentUsername, targetUsername)) return false;

    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const idx = users.findIndex(u => u.username === currentUsername);
    if (idx === -1) return false;

    const me = this.normalize(users[idx]);
    me.following = [...me.following, targetUsername];
    users[idx] = me;
    this.storage.set(USERS_KEY, users);

    if (this.auth.currentUser?.username === currentUsername) {
      this.auth.syncCurrentUser(me);
    }
    return true;
  }

  private makeNotification(
    type: NotificationType,
    fromUsername: string,
    postId?: string,
    excerpt?: string
  ): AppNotification {
    return {
      id: crypto.randomUUID(),
      type,
      fromUsername,
      postId,
      excerpt,
      read: false,
      timestamp: Date.now()
    };
  }
}
