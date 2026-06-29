import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Check, X, Clock, Users } from 'lucide-react';

interface Friendship {
  id: string;
  users: string[];
  status: 'pending' | 'accepted';
  requesterId: string;
  requesterUsername?: string;
  requesterAvatar?: string;
  receiverUsername?: string;
  receiverAvatar?: string;
}

const FriendsList = () => {
  const { currentUser } = useAppContext();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'add'>('all');
  const [searchUsername, setSearchUsername] = useState('');
  const [searchError, setSearchError] = useState('');
  const [searchSuccess, setSearchSuccess] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'friendships'),
      where('users', 'array-contains', currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Friendship[];
      setFriendships(data);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim() || !currentUser) return;
    
    const cleanUsername = searchUsername.toLowerCase().trim();
    if (cleanUsername === currentUser.username.toLowerCase()) {
      setSearchError("You cannot add yourself.");
      return;
    }

    setIsSearching(true);
    setSearchError('');
    setSearchSuccess('');

    try {
      // Find user by username
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('username', '==', cleanUsername));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("Username not found.");
      }

      const targetUser = querySnapshot.docs[0].data();
      
      // Check if friendship already exists
      const existing = friendships.find(f => f.users.includes(targetUser.uid));
      if (existing) {
        throw new Error("You are already friends or have a pending request.");
      }

      // Create request
      await addDoc(collection(db, 'friendships'), {
        users: [currentUser.uid, targetUser.uid],
        status: 'pending',
        requesterId: currentUser.uid,
        requesterUsername: currentUser.username,
        requesterAvatar: currentUser.avatar,
        receiverUsername: targetUser.username,
        receiverAvatar: targetUser.avatar,
        timestamp: serverTimestamp()
      });

      setSearchSuccess(`Friend request sent to ${targetUser.displayName || targetUser.username}!`);
      setSearchUsername('');
    } catch (err: any) {
      setSearchError(err.message || "Failed to send request.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleAccept = async (id: string) => {
    await updateDoc(doc(db, 'friendships', id), { status: 'accepted' });
  };

  const handleReject = async (id: string) => {
    await deleteDoc(doc(db, 'friendships', id));
  };

  const pendingRequests = friendships.filter(f => f.status === 'pending');
  const allFriends = friendships.filter(f => f.status === 'accepted');

  return (
    <div className="flex flex-col h-full bg-[#111116] rounded-2xl border border-white/5 overflow-hidden">
      
      {/* Tabs */}
      <div className="flex gap-6 p-4 border-b border-white/10 bg-black/20 px-6">
        <button onClick={() => setActiveTab('all')} className={`font-semibold flex items-center gap-2 transition-colors ${activeTab === 'all' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}>
          <Users size={18} /> All Friends
        </button>
        <button onClick={() => setActiveTab('pending')} className={`font-semibold flex items-center gap-2 transition-colors ${activeTab === 'pending' ? 'text-white' : 'text-white/40 hover:text-white/80'}`}>
          <Clock size={18} /> Pending
          {pendingRequests.length > 0 && (
            <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
              {pendingRequests.length}
            </span>
          )}
        </button>
        <button onClick={() => setActiveTab('add')} className={`font-semibold flex items-center gap-2 transition-colors px-3 py-1 rounded-md ${activeTab === 'add' ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-500 hover:bg-green-600/40'}`}>
          Add Friend
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 hide-scrollbar">
        {activeTab === 'add' && (
          <div className="max-w-xl">
            <h3 className="font-bold mb-2">ADD FRIEND</h3>
            <p className="text-sm text-white/50 mb-4">You can add friends with their Zephyr username.</p>
            <form onSubmit={handleSendRequest} className="relative">
              <input 
                type="text" 
                value={searchUsername}
                onChange={e => setSearchUsername(e.target.value)}
                placeholder="Enter a username"
                className="liquid-input w-full pr-32 bg-black/40 border-black"
              />
              <button disabled={isSearching || !searchUsername.trim()} type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                Send Friend Request
              </button>
            </form>
            {searchError && <p className="text-red-400 text-sm mt-3">{searchError}</p>}
            {searchSuccess && <p className="text-green-400 text-sm mt-3">{searchSuccess}</p>}
          </div>
        )}

        {activeTab === 'pending' && (
          <div>
            <h3 className="font-bold text-white/50 uppercase text-xs mb-4">Pending — {pendingRequests.length}</h3>
            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 text-white/30">
                <Clock size={48} className="mb-4 opacity-50" />
                <p>No pending friend requests</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingRequests.map(req => {
                  const isIncoming = req.requesterId !== currentUser?.uid;
                  const displayUsername = isIncoming ? req.requesterUsername : req.receiverUsername;
                  const displayAvatar = isIncoming ? req.requesterAvatar : req.receiverAvatar;

                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <img src={displayAvatar || 'https://via.placeholder.com/40'} alt="Avatar" className="w-10 h-10 rounded-full" />
                        <div>
                          <div className="font-bold">{displayUsername}</div>
                          <div className="text-xs text-white/40">{isIncoming ? 'Incoming Friend Request' : 'Outgoing Friend Request'}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {isIncoming && (
                          <button onClick={() => handleAccept(req.id)} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-green-400 hover:bg-green-500 hover:text-white transition-colors">
                            <Check size={18} />
                          </button>
                        )}
                        <button onClick={() => handleReject(req.id)} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors">
                          <X size={18} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div>
            <h3 className="font-bold text-white/50 uppercase text-xs mb-4">All Friends — {allFriends.length}</h3>
            {allFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-20 text-white/30">
                <Users size={48} className="mb-4 opacity-50" />
                <p>No friends added yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allFriends.map(req => {
                  const friendUsername = req.requesterId === currentUser?.uid ? req.receiverUsername : req.requesterUsername;
                  const friendAvatar = req.requesterId === currentUser?.uid ? req.receiverAvatar : req.requesterAvatar;

                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl border border-transparent hover:border-white/5 transition-all">
                      <div className="flex items-center gap-3">
                        <img src={friendAvatar || 'https://via.placeholder.com/40'} alt="Avatar" className="w-10 h-10 rounded-full" />
                        <div className="font-bold">{friendUsername}</div>
                      </div>
                      <button onClick={() => handleReject(req.id)} className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                        <X size={18} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsList;
