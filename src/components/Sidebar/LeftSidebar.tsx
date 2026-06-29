import { useAppContext } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { Radio, Mic, LogOut, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import ProfileModal from '../Modals/ProfileModal';
import UserAvatar from '../UserAvatar';

const channels = [
  { id: 'chill', name: 'Chill Chat', icon: null },
  { id: 'general', name: 'General Chat', icon: null },
  { id: 'discussions', name: 'Discussions', icon: null },
  { id: 'music', name: 'Music', icon: <Radio size={18} /> },
  { id: 'calls', name: 'Calls', icon: <Mic size={18} /> },
];

const LeftSidebar = () => {
  const { currentUser, activeChannel, setActiveChannel, setMobileView, activeDMs, allUsers, lastRead, channelMeta } = useAppContext();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  const hasUnread = (channelId: string) => {
    if (activeChannel === channelId) return false;
    const lastReadTime = lastRead[channelId] || 0;
    const lastMsgTime = channelMeta[channelId] || 0;
    return lastMsgTime > lastReadTime;
  };

  return (
    <div className="flex flex-col h-full bg-[#111116] border-r border-white/10 relative overflow-hidden">
      {/* Header */}
      <div className="p-6 shrink-0 shadow-sm z-10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-black overflow-hidden flex items-center justify-center border border-accent-dark/30">
          <img src="/logo.png" alt="Zephyr" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-accent to-indigo-400">Zephyr</h2>
      </div>
      
      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 hide-scrollbar">
        <button
          onClick={() => {
            setActiveChannel('home');
            setMobileView('feed');
          }}
          className={`w-full flex items-center gap-3 px-4 py-3 mb-4 rounded-xl transition-all ${
            activeChannel === 'home' 
              ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-lg' 
              : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
          }`}
        >
          <Users size={20} />
          <span className="font-bold">Friends</span>
        </button>

        <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-2">Rooms</div>
            {channels.map(channel => (
              <button
                key={channel.id}
                onClick={() => {
                  setActiveChannel(channel.id);
                  setMobileView('chat');
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeChannel === channel.id 
                    ? 'bg-white/15 border border-white/10 text-white shadow-lg' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <div className="relative">
                  {channel.icon && (
                    <div className={activeChannel === channel.id ? 'text-accent' : ''}>
                      {channel.icon}
                    </div>
                  )}
                  {!channel.icon && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                  )}
                  {hasUnread(channel.id) && (
                    <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-[#111116]"></div>
                  )}
                </div>
                <span className={`font-medium ${hasUnread(channel.id) ? 'text-white' : ''}`}>{channel.name}</span>
                {activeChannel === channel.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                )}
              </button>
            ))}

        {/* Direct Messages */}
        {activeDMs.length > 0 && (
          <div className="mt-6">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-2 flex items-center justify-between">
              Direct Messages
            </div>
            {activeDMs.map(dmUserId => {
              const user = allUsers.find(u => u.uid === dmUserId);
              if (!user) return null;
              const dmChannelId = currentUser ? `dm_${[currentUser.uid, dmUserId].sort().join('_')}` : '';
              
              return (
                <button
                  key={dmUserId}
                  onClick={() => {
                    setActiveChannel(dmChannelId);
                    setMobileView('chat');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                    activeChannel === dmChannelId 
                      ? 'bg-white/15 border border-white/10 text-white shadow-lg' 
                      : 'text-white/60 hover:bg-white/5 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <UserAvatar src={user.avatar} status={user.status as any} size="sm" />
                    {hasUnread(dmChannelId) && (
                      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-accent border-2 border-[#111116]"></div>
                    )}
                  </div>
                  <span className={`font-medium truncate ${hasUnread(dmChannelId) ? 'text-white' : ''}`}>{user.displayName || user.username}</span>
                  {activeChannel === dmChannelId && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
        <div 
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-lg transition-colors flex-1 overflow-hidden"
        >
          <UserAvatar src={currentUser?.avatar} status={currentUser?.status} device={currentUser?.device} size="sm" />
          <div className="flex-1 overflow-hidden">
            <div className="font-bold text-[13px] truncate">{currentUser?.displayName}</div>
            <div className="text-[11px] text-white/40 truncate">@{currentUser?.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setIsProfileModalOpen(true)} className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <Settings size={18} />
          </button>
          <button onClick={handleLogout} className="p-2 text-white/40 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
            <LogOut size={18} />
          </button>
        </div>
      </div>
      
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default LeftSidebar;
