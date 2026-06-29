import React, { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { User } from '../../types';

const RightSidebar = () => {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('username', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
      })) as User[];
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, []);

  const onlineUsers = users.filter(u => u.status === 'online' || u.status === 'idle' || u.status === 'dnd');
  const offlineUsers = users.filter(u => !u.status || u.status === 'offline' || (!['online', 'idle', 'dnd'].includes(u.status)));

  const renderUser = (user: User) => (
    <div key={user.uid} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
      <div className="relative shrink-0">
        <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt={user.username} className="w-8 h-8 rounded-full object-cover border border-white/10" />
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121218] ${
          user.status === 'online' ? 'bg-green-500' :
          user.status === 'idle' ? 'bg-yellow-500' :
          user.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
        }`}></div>
      </div>
      <div className="flex-1 overflow-hidden">
        <div className="font-medium text-sm truncate text-white/90 group-hover:text-white">{user.displayName || user.username}</div>
        {user.customStatus && (
          <div className="text-xs text-white/40 truncate">{user.customStatus}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-60 h-full bg-black/10 border-l border-white/10 hidden lg:flex flex-col">
      <div className="p-4 border-b border-white/10 shrink-0">
        <h3 className="font-bold text-white/80">Members</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6 hide-scrollbar">
        {onlineUsers.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Online — {onlineUsers.length}
            </div>
            <div className="space-y-1">
              {onlineUsers.map(renderUser)}
            </div>
          </div>
        )}
        
        {offlineUsers.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">
              Offline — {offlineUsers.length}
            </div>
            <div className="space-y-1">
              {offlineUsers.map(renderUser)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RightSidebar;
