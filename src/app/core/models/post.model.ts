import { Comment } from './comment.model';

export interface Post {
  id: string;
  authorUsername: string;
  content: string;
  photoUrls: string[];
  photoUrl?: string;
  likes: string[];
  comments: Comment[];
  createdAt: number;
}
