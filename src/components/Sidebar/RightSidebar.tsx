import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import type { User } from '../../types';
import UserAvatar from '../UserAvatar';

import { useAppContext } from '../../context/AppContext';
import { ChevronLeft } from 'lucide-react';

const RightSidebar = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { setMobileView, activeChannel } = useAppContext();

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
  const offlineUsers = users.filter(u => !u.status || (!['online', 'idle', 'dnd'].includes(u.status)));

  const renderUser = (user: User) => (
    <div key={user.uid} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors group">
      <UserAvatar src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} status={user.status as any} device={user.device as any} size="sm" />
      <div className="flex-1 overflow-hidden">
        <div className="font-medium text-sm truncate text-white/90 group-hover:text-white">{user.displayName || user.username}</div>
        {user.customStatus && (
          <div className="text-xs text-white/40 truncate">{user.customStatus}</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full lg:w-60 h-full bg-[#121218] border-l border-white/10 flex flex-col">
      <div className="p-4 border-b border-white/10 shrink-0 flex items-center gap-2">
        <button onClick={() => setMobileView(activeChannel === 'home' ? 'feed' : 'chat')} className="lg:hidden text-white/70 hover:text-white transition-colors">
          <ChevronLeft size={24} />
        </button>
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
