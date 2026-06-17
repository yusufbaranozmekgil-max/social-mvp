import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { StorageService } from './storage.service';
import { User } from '../models/user.model';

const USERS_KEY = 'users';
const CURRENT_KEY = 'currentUser';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private storage = inject(StorageService);

  private currentUserSubject = new BehaviorSubject<User | null>(
    this.storage.get<User>(CURRENT_KEY)
  );
  currentUser$: Observable<User | null> = this.currentUserSubject.asObservable();

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  register(username: string, email: string, password: string): { ok: boolean; error?: string } {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];

    if (users.some(u => u.username === username)) {
      return { ok: false, error: 'Bu kullanıcı adı zaten alınmış.' };
    }
    if (users.some(u => u.email === email)) {
      return { ok: false, error: 'Bu e-posta zaten kayıtlı.' };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username,
      email,
      password,
      bio: '',
      profilePhotoUrl: '',
      following: [],
      followRequests: [],
      notifications: [],
      isPrivate: false,
      createdAt: Date.now()
    };

    users.push(newUser);
    this.storage.set(USERS_KEY, users);
    this.syncCurrentUser(newUser);
    return { ok: true };
  }

  login(username: string, password: string): { ok: boolean; error?: string } {
    const users = this.storage.get<User[]>(USERS_KEY) ?? [];
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
      return { ok: false, error: 'Kullanıcı adı veya şifre hatalı.' };
    }

    this.syncCurrentUser(user);
    return { ok: true };
  }

  logout(): void {
    this.storage.remove(CURRENT_KEY);
    this.currentUserSubject.next(null);
  }

  syncCurrentUser(user: User): void {
    this.storage.set(CURRENT_KEY, user);
    this.currentUserSubject.next(user);
  }
}
