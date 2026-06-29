
import { useAppContext } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { Hash, Radio, Mic, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import ProfileModal from '../Modals/ProfileModal';

const channels = [
  { id: 'chill', name: 'Chill Chat', icon: null },
  { id: 'general', name: 'General Chat', icon: null },
  { id: 'discussions', name: 'Discussions', icon: null },
  { id: 'music', name: 'Music', icon: <Radio size={18} /> },
  { id: 'calls', name: 'Calls', icon: <Mic size={18} /> },
];

const LeftSidebar = () => {
  const { currentUser, activeChannel, setActiveChannel, setMobileView } = useAppContext();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="flex flex-col h-full bg-[#111116] border-r border-white/10 relative overflow-hidden">
      {/* Header */}
      <div className="p-6 shrink-0 shadow-sm z-10 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-black overflow-hidden flex items-center justify-center border border-cyan-500/30">
          <img src="/logo.png" alt="Zephyr" className="w-full h-full object-cover" />
        </div>
        <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400">Zephyr</h2>
      </div>
      
      {/* Channels List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 hide-scrollbar">
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
                {channel.icon && (
                  <div className={activeChannel === channel.id ? 'text-cyan-400' : ''}>
                    {channel.icon}
                  </div>
                )}
                {!channel.icon && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20"></div>
                )}
                <span className="font-medium">{channel.name}</span>
                {activeChannel === channel.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                )}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Profile Widget */}
      <div className="p-4 border-t border-white/10 bg-black/40 flex items-center justify-between shrink-0">
        <div 
          onClick={() => setIsProfileModalOpen(true)}
          className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-lg transition-colors flex-1 overflow-hidden"
        >
          <div className="relative shrink-0">
            <img src={currentUser?.avatar} alt="Avatar" className="w-9 h-9 rounded-full object-cover border border-white/20" />
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#121218] ${
              currentUser?.status === 'online' ? 'bg-green-500' :
              currentUser?.status === 'idle' ? 'bg-yellow-500' :
              currentUser?.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="font-bold text-[13px] truncate">{currentUser?.displayName}</div>
            <div className="text-[11px] text-white/40 truncate">@{currentUser?.username}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => setIsProfileModalOpen(true)} className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5">
            <Settings size={18} />
          </button>
        </div>
      </div>
      
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default LeftSidebar;
