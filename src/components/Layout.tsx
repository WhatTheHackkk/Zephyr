import LeftSidebar from './Sidebar/LeftSidebar';
import RightSidebar from './Sidebar/RightSidebar';
import CenterFeed from './Feed/CenterFeed';
import ChannelChat from './Chat/ChannelChat';
import CallRoom from './Chat/CallRoom';
import { useAppContext } from '../context/AppContext';

const Layout = () => {
  const { mobileView, activeChannel } = useAppContext();

  return (
    <div className="w-full h-full relative z-10 grid md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_240px] overflow-hidden">
      {/* Mobile screens only show one view at a time based on mobileView state */}
      <div className={`w-full h-full md:block ${mobileView === 'channels' ? 'block' : 'hidden'}`}>
        <LeftSidebar />
      </div>
      <div className={`w-full h-full md:block border-l border-white/10 bg-black/10 ${(mobileView !== 'channels' && mobileView !== 'members') ? 'block' : 'hidden'}`}>
        {activeChannel === 'home' ? <CenterFeed /> : activeChannel === 'calls' ? <CallRoom /> : <ChannelChat />}
      </div>
      <div className={`w-full h-full lg:block ${mobileView === 'members' ? 'block' : 'hidden'}`}>
        <RightSidebar />
      </div>
    </div>
  );
};

export default Layout;
