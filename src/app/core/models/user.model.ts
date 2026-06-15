export interface User {
  id: string;
  username: string;
  email: string;
  password: string;
  bio: string;
  profilePhotoUrl: string;
  following: string[];
  createdAt: number;
}
