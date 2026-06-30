import React, { useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { Smile, CornerUpLeft, Forward, Copy, Pin, BellOff, Link2, Flag, Edit2, Trash2 } from 'lucide-react';

const ContextMenu: React.FC = () => {
  const { contextMenu, setContextMenu, currentUser } = useAppContext();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
    };
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, setContextMenu]);

  // Close context menu on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (contextMenu) setContextMenu(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [contextMenu, setContextMenu]);

  if (!contextMenu) return null;

  const { x, y, type, data } = contextMenu;

  // Prevent menu from going off-screen
  const menuStyle: React.CSSProperties = {
    top: Math.min(y, window.innerHeight - 300), // Approximate max height
    left: Math.min(x, window.innerWidth - 220), // Width is w-56 (224px)
  };

  const handleAction = (action: string) => {
    // Invoke the callback provided in data
    if (data?.onAction) {
      data.onAction(action, data.message);
    }
    setContextMenu(null);
  };

  return (
    <div 
      ref={menuRef}
      className="fixed z-[9999] w-56 bg-[#111116] border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.8)] py-2 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={menuStyle}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {type === 'message' && (
        <>
          <div className="flex px-2 pb-2 mb-2 border-b border-white/10 gap-1">
            <button onClick={() => handleAction('react_thumbsup')} className="flex-1 flex justify-center py-1.5 rounded-lg hover:bg-white/10 transition-colors text-yellow-400">👍</button>
            <button onClick={() => handleAction('react_heart')} className="flex-1 flex justify-center py-1.5 rounded-lg hover:bg-white/10 transition-colors text-red-500">❤️</button>
            <button onClick={() => handleAction('react_joy')} className="flex-1 flex justify-center py-1.5 rounded-lg hover:bg-white/10 transition-colors">😂</button>
            <button onClick={() => handleAction('react_more')} className="flex-1 flex items-center justify-center py-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/50 hover:text-white">
              <Smile size={16} />
            </button>
          </div>
          
          <button onClick={() => handleAction('reply')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-accent hover:text-white transition-colors group">
            <span>Reply</span>
            <CornerUpLeft size={14} className="opacity-50 group-hover:opacity-100" />
          </button>
          <button onClick={() => handleAction('forward')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-accent transition-colors group">
            <span>Forward</span>
            <Forward size={14} className="opacity-50 group-hover:opacity-100" />
          </button>
          
          <div className="h-px bg-white/10 my-1.5"></div>
          
          <button onClick={() => handleAction('copy_text')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-accent transition-colors group">
            <span>Copy Text</span>
            <Copy size={14} className="opacity-50 group-hover:opacity-100" />
          </button>
          <button onClick={() => handleAction('pin_message')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-accent transition-colors group">
            <span>Pin Message</span>
            <Pin size={14} className="opacity-50 group-hover:opacity-100" />
          </button>
          <button onClick={() => handleAction('mark_unread')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-accent transition-colors group">
            <span>Mark Unread</span>
            <BellOff size={14} className="opacity-50 group-hover:opacity-100" />
          </button>
          <button onClick={() => handleAction('copy_link')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-accent transition-colors group">
            <span>Copy Message Link</span>
            <Link2 size={14} className="opacity-50 group-hover:opacity-100" />
          </button>

          <div className="h-px bg-white/10 my-1.5"></div>
          
          {data?.message?.authorId === currentUser?.uid && (
            <button onClick={() => handleAction('edit')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-white/70 hover:text-white hover:bg-accent transition-colors group">
              <span>Edit Message</span>
              <Edit2 size={14} className="opacity-50 group-hover:opacity-100" />
            </button>
          )}

          <button onClick={() => handleAction('report')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-red-400 hover:text-white hover:bg-red-500 transition-colors group">
            <span>Report Message</span>
            <Flag size={14} className="opacity-50 group-hover:opacity-100" />
          </button>

          {(data?.message?.authorId === currentUser?.uid || currentUser?.isAdmin) && (
            <button onClick={() => handleAction('delete')} className="w-full flex items-center justify-between px-3 py-1.5 text-sm text-red-400 hover:text-white hover:bg-red-500 transition-colors group">
              <span>Delete Message</span>
              <Trash2 size={14} className="opacity-50 group-hover:opacity-100" />
            </button>
          )}
        </>
      )}

      {type === 'generic' && (
        <div className="px-3 py-2 text-sm text-white/50 text-center font-bold">
          Zephyr App v1.0
        </div>
      )}
    </div>
  );
};

export default ContextMenu;
