import { useState } from 'react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { useAppContext } from '../../context/AppContext';
import { Mic, ChevronLeft, MoreVertical, Loader2 } from 'lucide-react';

const CallRoom = () => {
  const { currentUser, setMobileView, activeChannel } = useAppContext();
  const [isLoading, setIsLoading] = useState(true);

  if (!currentUser) return null;

  return (
    <div className="liquid-glass h-full flex flex-col gravity-target relative overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileView('channels')} className="md:hidden text-white/70 hover:text-white transition-colors mr-1">
            <ChevronLeft size={24} />
          </button>
          <Mic size={20} className="text-cyan-400" />
          <h3 className="font-bold text-lg capitalize truncate max-w-[120px] md:max-w-none">{activeChannel}</h3>
        </div>
        <button className="text-white/40 hover:text-white transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Jitsi Meeting Container */}
      <div className="flex-1 relative w-full h-full bg-[#111116]">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 z-10 bg-[#111116]">
            <Loader2 size={48} className="animate-spin mb-4 text-cyan-400" />
            <p>Connecting to {activeChannel} server...</p>
          </div>
        )}
        
        <JitsiMeeting
          roomName={`ZephyrHub-${activeChannel}-Room-2026`}
          configOverwrite={{
            startWithAudioMuted: false,
            startWithVideoMuted: true,
            disableModeratorIndicator: true,
            startScreenSharing: false,
            enableEmailInStats: false,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
            SHOW_BRAND_WATERMARK: false,
            HIDE_INVITE_MORE_HEADER: true,
            DEFAULT_LOGO_URL: '',
            DEFAULT_WELCOME_PAGE_LOGO_URL: '',
          }}
          userInfo={{
            displayName: currentUser.displayName || currentUser.username,
            email: currentUser.email || '',
            avatarURL: currentUser.avatar || '',
          } as any}
          onApiReady={() => {
            setIsLoading(false);
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
            iframeRef.style.border = 'none';
          }}
        />
      </div>
    </div>
  );
};

export default CallRoom;
