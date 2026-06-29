import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from 'firebase/firestore';
import type { Post } from '../../types';
import { Send, Heart, MessageSquare, Image as ImageIcon, Menu, MessageCircle, Users, Activity } from 'lucide-react';
import FriendsList from '../Friends/FriendsList';

const CenterFeed = () => {
  const { currentUser, setMobileView } = useAppContext();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [homeTab, setHomeTab] = useState<'timeline' | 'friends'>('timeline');

  useEffect(() => {
    const q = query(collection(db, 'posts'), orderBy('timestamp', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
    });
    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !currentUser) return;

    try {
      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorName: currentUser.username,
        authorAvatar: currentUser.avatar,
        content: newPostContent,
        likes: 0,
        comments: [],
        timestamp: serverTimestamp()
      });
      setNewPostContent('');
    } catch (err) {
      console.error("Error adding post: ", err);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      {/* Header */}
      <div className="liquid-glass p-4 md:p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileView('channels')} className="md:hidden text-white/70 hover:text-white transition-colors">
            <Menu size={24} />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold flex items-center gap-4">
              <button onClick={() => setHomeTab('timeline')} className={`transition-colors ${homeTab === 'timeline' ? 'text-white' : 'text-white/40 hover:text-white/70'} flex items-center gap-2`}>
                <Activity size={20} /> Timeline
              </button>
              <span className="w-[1px] h-6 bg-white/10"></span>
              <button onClick={() => setHomeTab('friends')} className={`transition-colors ${homeTab === 'friends' ? 'text-white' : 'text-white/40 hover:text-white/70'} flex items-center gap-2`}>
                <Users size={20} /> Friends
              </button>
            </h2>
          </div>
        </div>
        <button onClick={() => setMobileView('chat')} className="md:hidden text-white/70 hover:text-white transition-colors">
          <MessageCircle size={24} />
        </button>
      </div>

      {homeTab === 'friends' ? (
        <div className="flex-1 p-2 md:p-6 overflow-hidden">
          <FriendsList />
        </div>
      ) : (
        <>
          {/* Create Post */}
      <form onSubmit={handleCreatePost} className="liquid-glass p-4 gravity-target">
        <div className="flex gap-4">
          <img src={currentUser?.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-white/20" />
          <div className="flex-1">
            <textarea 
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="What's on your mind?"
              className="w-full bg-transparent border-none text-white focus:ring-0 resize-none h-12 text-lg outline-none placeholder:text-white/30"
            />
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
              <button type="button" className="text-white/40 hover:text-cyan-400 transition-colors">
                <ImageIcon size={20} />
              </button>
              <button type="submit" disabled={!newPostContent.trim()} className="liquid-btn liquid-btn-primary px-6 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                Post <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-6 pb-6">
        {posts.map(post => (
          <div key={post.id} className="liquid-glass p-6 gravity-target animate-in slide-in-from-bottom-4 duration-500">
            <div className="flex gap-4">
              <img src={post.authorAvatar} alt={post.authorName} className="w-12 h-12 rounded-full border border-white/20" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-lg">{post.authorName}</span>
                  <span className="text-white/40 text-sm">just now</span>
                </div>
                <p className="text-white/90 leading-relaxed text-[15px]">{post.content}</p>
                {post.image && (
                  <img src={post.image} alt="Post content" className="mt-4 rounded-xl max-h-[300px] w-full object-cover border border-white/10" />
                )}
                <div className="flex gap-6 mt-6">
                  <button className="flex items-center gap-2 text-white/40 hover:text-pink-400 transition-colors group">
                    <Heart size={18} className="group-hover:fill-pink-400/20" />
                    <span className="text-sm font-medium">{post.likes}</span>
                  </button>
                  <button className="flex items-center gap-2 text-white/40 hover:text-cyan-400 transition-colors">
                    <MessageSquare size={18} />
                    <span className="text-sm font-medium">{post.comments?.length || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {posts.length === 0 && (
          <div className="text-center text-white/40 mt-10 gravity-target">No posts yet. Be the first to break the silence!</div>
        )}
      </div>
      </>
      )}
    </div>
  );
};

export default CenterFeed;
