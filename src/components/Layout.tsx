import LeftSidebar from './Sidebar/LeftSidebar';
import RightSidebar from './Sidebar/RightSidebar';
import CenterFeed from './Feed/CenterFeed';
import ChannelChat from './Chat/ChannelChat';
import CallRoom from './Chat/CallRoom';
import { useAppContext } from '../context/AppContext';

import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const { mobileView, activeChannel, leftSidebarOpen } = useAppContext();

  return (
    <div className="w-full h-full relative z-10 flex overflow-hidden">
      {/* Mobile screens only show one view at a time based on mobileView state */}
      
      {/* Left Sidebar */}
      <div 
        className={`h-full shrink-0 transition-[width,opacity] duration-300 ease-in-out
          ${mobileView === 'channels' ? 'w-full block opacity-100' : 'hidden md:block'}
          ${leftSidebarOpen ? 'md:w-[280px] md:opacity-100' : 'md:w-0 md:opacity-0'}
          overflow-hidden
        `}
      >
        <div className="w-full md:w-[280px] h-full">
          <LeftSidebar />
        </div>
      </div>
      
      {/* Center View */}
      <div className={`flex-1 h-full border-l border-white/10 bg-black/10 relative overflow-hidden ${(mobileView !== 'channels' && mobileView !== 'members') ? 'block' : 'hidden md:block'}`}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeChannel}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="w-full h-full absolute inset-0"
          >
            {activeChannel === 'home' ? <CenterFeed /> : activeChannel === 'calls' ? <CallRoom /> : <ChannelChat />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Right Sidebar */}
      <div className={`h-full shrink-0 ${mobileView === 'members' ? 'w-full block' : 'hidden lg:block lg:w-[240px]'}`}>
        <RightSidebar />
      </div>
    </div>
  );
};

export default Layout;
