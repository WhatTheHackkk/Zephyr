export interface User {
  uid: string;
  username: string;
  email?: string;
  avatar: string;
  banner: string;
  status: 'online' | 'idle' | 'dnd';
  displayName?: string;
  customStatus?: string;
  bio?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  image?: string;
  likes: number;
  comments: Comment[];
  timestamp: number;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  channelId: string;
  content: string;
  attachmentUrl?: string;
  timestamp: number;
}

export interface AppState {
  currentUser: User | null;
  activeChannel: string;
  mobileView: 'channels' | 'feed' | 'chat';
}
