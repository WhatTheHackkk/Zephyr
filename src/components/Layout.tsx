import LeftSidebar from './Sidebar/LeftSidebar';
import RightSidebar from './Sidebar/RightSidebar';
import CenterFeed from './Feed/CenterFeed';
import ChannelChat from './Chat/ChannelChat';
import CallRoom from './Chat/CallRoom';
import { useAppContext } from '../context/AppContext';

import { motion, AnimatePresence } from 'framer-motion';

const Layout = () => {
  const { mobileView, activeChannel } = useAppContext();

  return (
    <div className="w-full h-full relative z-10 grid md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_240px] overflow-hidden">
      {/* Mobile screens only show one view at a time based on mobileView state */}
      <div className={`w-full h-full md:block ${mobileView === 'channels' ? 'block' : 'hidden'}`}>
        <LeftSidebar />
      </div>
      
      <div className={`w-full h-full md:block border-l border-white/10 bg-black/10 relative overflow-hidden ${(mobileView !== 'channels' && mobileView !== 'members') ? 'block' : 'hidden'}`}>
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

      <div className={`w-full h-full lg:block ${mobileView === 'members' ? 'block' : 'hidden'}`}>
        <RightSidebar />
      </div>
    </div>
  );
};

export default Layout;
