import React, { createContext, useContext, useState } from 'react';
import type { User, Post, ChatMessage } from '../types';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeChannel: string;
  setActiveChannel: (channel: string) => void;
  mobileView: 'channels' | 'feed' | 'chat';
  setMobileView: (view: 'channels' | 'feed' | 'chat') => void;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChannel, setActiveChannel] = useState('home');
  const [mobileView, setMobileView] = useState<'channels' | 'feed' | 'chat'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      activeChannel, setActiveChannel,
      mobileView, setMobileView,
      posts, setPosts,
      messages, setMessages
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
