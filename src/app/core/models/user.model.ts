import { AppNotification } from './notification.model';

export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  bio: string;
  profilePhotoUrl: string;
  following: string[];
  followRequests: string[];
  notifications: AppNotification[];
  isPrivate: boolean;
  bookmarks: string[];
  createdAt: number;
}
