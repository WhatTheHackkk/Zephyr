import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { collection, onSnapshot, updateDoc, doc, query, orderBy } from 'firebase/firestore';
import type { User } from '../../types';
import UserAvatar from '../UserAvatar';
import UserProfileModal from '../Modals/UserProfileModal';

import { useAppContext } from '../../context/AppContext';
import { ChevronLeft, MessageSquare } from 'lucide-react';

const RightSidebar = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const { setMobileView, activeChannel, currentUser, setActiveChannel } = useAppContext();

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

  const startDM = async (friendId: string) => {
    if (!currentUser) return;
    const dmId = `dm_${[currentUser.uid, friendId].sort().join('_')}`;

    if (!currentUser.activeDMs?.includes(friendId)) {
      const newDMs = [...(currentUser.activeDMs || []), friendId];
      await updateDoc(doc(db, 'users', currentUser.uid), { activeDMs: newDMs });
    }

    setActiveChannel(dmId);
    setMobileView('chat');
  };

  const renderUser = (user: User) => (
    <div key={user.uid} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group">
      <div 
        className="flex items-center gap-3 flex-1 cursor-pointer"
        onClick={() => setProfileModalUserId(user.uid)}
      >
        <UserAvatar src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} status={user.status as any} device={user.device as any} size="sm" />
        <div className="flex-1 overflow-hidden">
          <div className="font-medium text-sm truncate text-white/90 group-hover:text-white">{user.displayName || user.username}</div>
          {user.customStatus && (
            <div className="text-xs text-white/40 truncate">{user.customStatus}</div>
          )}
        </div>
      </div>
      {user.uid !== currentUser?.uid && (
        <button 
          onClick={() => startDM(user.uid)}
          className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-accent hover:bg-accent-dark hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"
          title="Message"
        >
          <MessageSquare size={14} />
        </button>
      )}
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

      {profileModalUserId && <UserProfileModal userId={profileModalUserId} onClose={() => setProfileModalUserId(null)} />}
    </div>
  );
};

export default RightSidebar;
