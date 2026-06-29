import React, { useEffect, useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '../../types';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser({ uid: docSnap.id, ...docSnap.data() } as User);
        }
      } catch (err) {
        console.error("Error fetching user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId]);

  if (loading) return null;
  if (!user) return null;

  const joinDate = (user as any).createdAt 
    ? new Date((user as any).createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown';

  const renderMedia = (url: string, className: string) => {
    if (!url) return <div className={`bg-black/40 ${className}`}></div>;
    const isVideo = url.includes('.mp4') || url.includes('.webm');
    if (isVideo) {
      return <video src={url} autoPlay loop muted playsInline className={`object-cover ${className}`} />;
    }
    return <img src={url} alt="Media" className={`object-cover ${className}`} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={onClose}>
      <div 
        className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 z-20 p-1.5 bg-black/50 text-white/70 hover:text-white transition-colors rounded-full hover:bg-black/80">
          <X size={18} />
        </button>

        {/* Banner */}
        <div className="relative h-28 bg-accent/20 z-10">
          {user.banner && renderMedia(user.banner, "w-full h-full")}
        </div>

        {/* Avatar */}
        <div className="absolute left-4 top-16 z-30">
          <div className="relative w-20 h-20 rounded-full border-[6px] border-[#111116] overflow-hidden bg-black shadow-lg">
            {renderMedia(user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`, "w-full h-full")}
          </div>
          <div className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-4 border-[#111116] ${
            user.status === 'online' ? 'bg-green-500' :
            user.status === 'idle' ? 'bg-yellow-500' :
            user.status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
          }`}></div>
        </div>

        {/* Content */}
        <div className="p-5 pt-12 bg-gradient-to-b from-white/5 to-transparent flex-1">
          <div className="mb-4 bg-black/20 p-3 rounded-xl border border-white/5">
            <h3 className="text-xl font-bold text-white leading-tight">{user.displayName || user.username}</h3>
            <p className="text-sm text-white/50">{user.username}</p>
            {user.customStatus && (
              <p className="text-sm text-white mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                💬 {user.customStatus}
              </p>
            )}
          </div>

          <div className="space-y-4">
            {user.bio && (
              <div>
                <h4 className="text-xs font-bold text-white/50 uppercase mb-1">About Me</h4>
                <p className="text-sm text-white/80 leading-relaxed whitespace-pre-wrap">{user.bio}</p>
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-white/50 uppercase mb-2">Zephyr Member Since</h4>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <Calendar size={16} className="text-accent" />
                {joinDate}
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default UserProfileModal;
