import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Post, ChatMessage } from '../types';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

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
  leftSidebarOpen: boolean;
  setLeftSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeDMs: string[];
  setActiveDMs: React.Dispatch<React.SetStateAction<string[]>>;
  lastRead: Record<string, number>;
  channelMeta: Record<string, number>;
  theme: string;
  setTheme: (theme: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeChannel, setActiveChannelState] = useState(() => localStorage.getItem('zephyr_activeChannel') || 'home');
  const [mobileView, setMobileView] = useState<'channels' | 'feed' | 'chat' | 'members'>('feed');
  const [posts, setPosts] = useState<Post[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [activeDMs, setActiveDMs] = useState<string[]>([]);
  
  const [lastRead, setLastRead] = useState<Record<string, number>>(() => JSON.parse(localStorage.getItem('zephyr_lastRead') || '{}'));
  const [channelMeta, setChannelMeta] = useState<Record<string, number>>({});
  const [theme, setThemeState] = useState(() => localStorage.getItem('zephyr_theme') || 'cyan');

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('zephyr_theme', newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    const themes = {
      cyan: { color: '#22d3ee', dark: '#06b6d4', glow: 'rgba(34, 211, 238, 0.4)' },
      purple: { color: '#c084fc', dark: '#a855f7', glow: 'rgba(192, 132, 252, 0.4)' },
      green: { color: '#4ade80', dark: '#22c55e', glow: 'rgba(74, 222, 128, 0.4)' },
      rose: { color: '#fb7185', dark: '#f43f5e', glow: 'rgba(251, 113, 133, 0.4)' },
      orange: { color: '#fb923c', dark: '#f97316', glow: 'rgba(251, 146, 60, 0.4)' }
    };
    const currentTheme = themes[theme as keyof typeof themes] || themes.cyan;
    root.style.setProperty('--accent-color', currentTheme.color);
    root.style.setProperty('--accent-dark', currentTheme.dark);
    root.style.setProperty('--accent-glow', currentTheme.glow);
  }, [theme]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'channel_meta'), (snapshot) => {
      const meta: Record<string, number> = {};
      snapshot.forEach(doc => {
        if (doc.data().lastMessageAt?.toMillis) {
          meta[doc.id] = doc.data().lastMessageAt.toMillis();
        }
      });
      setChannelMeta(meta);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.activeDMs) {
      setActiveDMs(currentUser.activeDMs);
    }
  }, [currentUser]);

  const setActiveChannel = (channel: string) => {
    setActiveChannelState(channel);
    localStorage.setItem('zephyr_activeChannel', channel);
    
    setLastRead(prev => {
      const newLastRead = { ...prev, [channel]: Date.now() };
      localStorage.setItem('zephyr_lastRead', JSON.stringify(newLastRead));
      return newLastRead;
    });
  };

  return (
    <AppContext.Provider value={{
      currentUser, setCurrentUser,
      activeChannel, setActiveChannel,
      mobileView, setMobileView,
      posts, setPosts,
      messages, setMessages,
      allUsers, setAllUsers,
      leftSidebarOpen, setLeftSidebarOpen,
      activeDMs, setActiveDMs,
      lastRead, channelMeta,
      theme, setTheme
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
