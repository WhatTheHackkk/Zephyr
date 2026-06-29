
import { useAppContext } from '../../context/AppContext';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { Hash, Radio, Mic, LogOut, Settings } from 'lucide-react';
import { useState } from 'react';
import ProfileModal from '../Modals/ProfileModal';

const channels = [
  { id: 'chill', name: 'Chill Chat', icon: <Hash size={18} /> },
  { id: 'general', name: 'General Chat', icon: <Hash size={18} /> },
  { id: 'discussions', name: 'Discussions', icon: <Hash size={18} /> },
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
    <div className="flex gap-4 h-full">
      {/* Servers Strip */}
      <div className="liquid-glass w-20 h-full flex flex-col items-center py-6 gap-6 relative gravity-target">
        <div 
          onClick={() => { setActiveChannel('home'); setMobileView('feed'); }}
          className={`w-12 h-12 rounded-2xl bg-black overflow-hidden flex items-center justify-center border transition-all cursor-pointer server-icon group ${activeChannel === 'home' ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] rounded-xl' : 'border-cyan-500/30 hover:border-cyan-400 hover:rounded-xl'}`}
        >
          <img src="/logo.png" alt="Zephyr" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
        </div>
        <div className="w-8 h-[2px] bg-white/10 rounded-full"></div>
      </div>

      {/* Channels & Profile */}
      <div className="liquid-glass flex-1 h-full flex flex-col gravity-target relative overflow-hidden">
        <div className="p-6 flex-1">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-indigo-400 mb-6">Zephyr</h2>
          
          <div className="space-y-2">
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
                <div className={activeChannel === channel.id ? 'text-cyan-400' : ''}>
                  {channel.icon}
                </div>
                <span className="font-medium">{channel.name}</span>
                {activeChannel === channel.id && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Profile Widget */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex items-center justify-between">
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 -ml-2 rounded-lg transition-colors flex-1 overflow-hidden"
          >
            <div className="relative">
              <img src={currentUser?.avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-white/20" />
              <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[2.5px] border-[#121218] ${
                currentUser?.status === 'online' ? 'bg-green-500' :
                currentUser?.status === 'idle' ? 'bg-yellow-500' :
                currentUser?.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
              }`}></div>
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="font-bold text-sm truncate">{currentUser?.displayName}</div>
              <div className="text-xs text-white/40 truncate">@{currentUser?.username}</div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsProfileModalOpen(true)} className="p-2 text-white/40 hover:text-white transition-colors rounded-lg hover:bg-white/5">
              <Settings size={16} />
            </button>
            <button onClick={handleLogout} className="p-2 text-white/40 hover:text-red-400 transition-colors rounded-lg hover:bg-white/5">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
      
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default LeftSidebar;
