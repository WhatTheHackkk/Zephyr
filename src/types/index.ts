export interface User {
  uid: string;
  username: string;
  email: string;
  avatar?: string;
  banner: string;
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  displayName?: string;
  customStatus?: string;
  theme?: string;
  profileCompleted?: boolean;
  bio?: string;
  device?: 'desktop' | 'mobile' | 'web';
  activeDMs?: string[];
  pinnedDMs?: string[];
  blockedUsers?: string[];
  isAdmin?: boolean;
  isBanned?: boolean;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  image?: string;
  images?: string[];
  likes: number;
  reactions?: Record<string, string[]>;
  comments: Comment[]; // Keeping for legacy or count, but we'll use subcollections
  timestamp: any;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: any;
}

export interface ChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  channelId: string;
  content: string;
  attachmentUrl?: string;
  reactions?: Record<string, string[]>;
  replyToId?: string;
  replyToContent?: string;
  replyToAuthor?: string;
  timestamp: any;
}

export interface AppState {
  currentUser: User | null;
  activeChannel: string;
  mobileView: 'channels' | 'feed' | 'chat';
}
