import React, { createContext, useContext, useState } from 'react';
import type { User, Post, ChatMessage } from '../types';

interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  activeChannel: string;
  setActiveChannel: (channel: string) => void;
  mobileView: 'channels' | 'feed' | 'chat' | 'members';
  setMobileView: (view: 'channels' | 'feed' | 'chat' | 'members') => void;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  allUsers: User[];
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChannel, setActiveChannelState] = useState(() => localStorage.getItem('zephyr_activeChannel') || 'home');
  const [mobileView, setMobileView] = useState<'channels' | 'feed' | 'chat' | 'members'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  const setActiveChannel = (channel: string) => {
    setActiveChannelState(channel);
    localStorage.setItem('zephyr_activeChannel', channel);
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      activeChannel, setActiveChannel,
      mobileView, setMobileView,
      posts, setPosts,
      messages, setMessages,
      allUsers, setAllUsers
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
