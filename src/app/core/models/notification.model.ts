export type NotificationType = 'like' | 'comment' | 'follow_request' | 'follow_accepted';

export interface AppNotification {
  id: string;
  type: NotificationType;
  fromUsername: string;
  postId?: string;
  excerpt?: string;
  read: boolean;
  timestamp: number;
}
