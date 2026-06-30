import React, { useEffect, useState } from 'react';
import { X, Calendar, MessageSquare, UserPlus, UserMinus, Ban } from 'lucide-react';
import { db } from '../../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import type { User } from '../../types';
import { useAppContext } from '../../context/AppContext';

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ userId, onClose }) => {
  const { currentUser, setCurrentUser, setActiveChannel, setMobileView } = useAppContext();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [isFriend, setIsFriend] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const docRef = doc(db, 'users', userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setUser({ uid: docSnap.id, ...docSnap.data() } as User);
        }

        if (currentUser && currentUser.uid !== userId) {
          const q = query(
            collection(db, 'friendships'),
            where('users', 'array-contains', currentUser.uid)
          );
          const snap = await getDocs(q);
          const friendship = snap.docs.find(d => {
            const data = d.data();
            return data.users.includes(userId);
          });
          
          if (friendship) {
            setFriendshipId(friendship.id);
            setIsFriend(friendship.data().status === 'accepted');
            setIsPending(friendship.data().status === 'pending');
          }
        }
      } catch (err) {
        console.error("Error fetching user profile", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [userId, currentUser]);

  const isBlocked = currentUser?.blockedUsers?.includes(userId) || false;

  const handleBlock = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayUnion(userId)
      });
      setCurrentUser({
        ...currentUser,
        blockedUsers: [...(currentUser.blockedUsers || []), userId]
      });
      
      // Also remove friendship if exists
      if (friendshipId) {
        await deleteDoc(doc(db, 'friendships', friendshipId));
        setFriendshipId(null);
        setIsFriend(false);
        setIsPending(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblock = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        blockedUsers: arrayRemove(userId)
      });
      setCurrentUser({
        ...currentUser,
        blockedUsers: (currentUser.blockedUsers || []).filter(id => id !== userId)
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFriend = async () => {
    if (!currentUser || isPending || isFriend || isBlocked) return;
    try {
      await addDoc(collection(db, 'friendships'), {
        users: [currentUser.uid, userId],
        status: 'pending',
        requesterId: currentUser.uid,
        createdAt: serverTimestamp()
      });
      setIsPending(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFriend = async () => {
    if (!friendshipId) return;
    try {
      await deleteDoc(doc(db, 'friendships', friendshipId));
      setFriendshipId(null);
      setIsFriend(false);
      setIsPending(false);
    } catch (err) {
      console.error(err);
    }
  };

  const startDM = async () => {
    if (!currentUser || isBlocked) return;
    const dmId = `dm_${[currentUser.uid, userId].sort().join('_')}`;

    if (!currentUser.activeDMs?.includes(userId)) {
      const newDMs = [...(currentUser.activeDMs || []), userId];
      await updateDoc(doc(db, 'users', currentUser.uid), { activeDMs: newDMs });
      setCurrentUser({
        ...currentUser,
        activeDMs: newDMs
      });
    }

    setActiveChannel(dmId);
    setMobileView('chat');
    onClose();
  };

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
        <div className="p-5 pt-12 bg-gradient-to-b from-white/5 to-transparent flex-1 flex flex-col">
          <div className="mb-4 bg-black/20 p-3 rounded-xl border border-white/5">
            <h3 className="text-xl font-bold text-white leading-tight">{user.displayName || user.username}</h3>
            <p className="text-sm text-white/50">{user.username}</p>
            {user.customStatus && (
              <p className="text-sm text-white mt-2 pt-2 border-t border-white/10 flex items-center gap-2">
                💬 {user.customStatus}
              </p>
            )}
          </div>

          <div className="space-y-4 flex-1">
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
          
          {/* Actions */}
          {currentUser && currentUser.uid !== user.uid && (
            <div className="mt-6 pt-4 border-t border-white/10 space-y-2">
              <div className="flex gap-2">
                <button 
                  onClick={startDM}
                  className="flex-1 bg-accent/20 hover:bg-accent text-accent hover:text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare size={16} /> Message
                </button>
                <button 
                  onClick={isFriend ? handleRemoveFriend : handleAddFriend}
                  className="flex-1 bg-white/5 hover:bg-white/10 text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isFriend ? <UserMinus size={16} /> : <UserPlus size={16} />}
                  {isFriend ? 'Remove Friend' : 'Add Friend'}
                </button>
              </div>
              <button 
                onClick={isBlocked ? handleUnblock : handleBlock}
                className={`w-full font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isBlocked ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                <Ban size={16} /> {isBlocked ? 'Unblock User' : 'Block User'}
              </button>
              {currentUser.isAdmin && (
                <button className="w-full mt-2 font-medium py-2 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500 hover:text-white transition-colors flex items-center justify-center gap-2 border border-orange-500/30">
                  Kick/Ban User
                </button>
              )}
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
};

export default UserProfileModal;
