import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import type { Post } from '../../types';
import { Send, Heart, MessageSquare, Image as ImageIcon, Menu, MessageCircle, Users, Activity, X, MoreHorizontal, Trash2, Edit2, Smile } from 'lucide-react';
import FriendsList from '../Friends/FriendsList';
import { uploadMedia } from '../../utils/uploadMedia';

const CenterFeed = () => {
  const { currentUser, setMobileView } = useAppContext();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [homeTab, setHomeTab] = useState<'timeline' | 'friends'>('timeline');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showOptionsFor, setShowOptionsFor] = useState<string | null>(null);
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const handleEditPost = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, 'posts', postId), { content: editContent });
      setEditingPostId(null);
    } catch (err) {
      console.error("Error editing post:", err);
    }
  };

  const handleReaction = async (postId: string, emoji: string, currentReactions: Record<string, string[]> = {}) => {
    if (!currentUser) return;
    try {
      const postRef = doc(db, 'posts', postId);
      const newReactions = { ...currentReactions };
      if (!newReactions[emoji]) newReactions[emoji] = [];
      
      const userIndex = newReactions[emoji].indexOf(currentUser.uid);
      if (userIndex > -1) {
        newReactions[emoji].splice(userIndex, 1);
        if (newReactions[emoji].length === 0) delete newReactions[emoji];
      } else {
        newReactions[emoji].push(currentUser.uid);
      }
      await updateDoc(postRef, { reactions: newReactions });
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

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

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) {
          setAttachment(file);
          break;
        }
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newPostContent.trim() && !attachment) || !currentUser || isUploading) return;

    setIsUploading(true);
    try {
      let attachmentUrl = '';
      if (attachment) {
        attachmentUrl = await uploadMedia(attachment);
      }

      await addDoc(collection(db, 'posts'), {
        authorId: currentUser.uid,
        authorName: currentUser.username,
        authorAvatar: currentUser.avatar,
        content: newPostContent,
        image: attachmentUrl || null,
        likes: 0,
        comments: [],
        timestamp: serverTimestamp()
      });
      setNewPostContent('');
      setAttachment(null);
    } catch (err) {
      console.error("Error adding post: ", err);
      alert("Failed to post: " + (err as Error).message);
    } finally {
      setIsUploading(false);
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
          <img src={currentUser?.avatar} alt="Avatar" className="w-10 h-10 rounded-full border border-white/20 shrink-0" />
          <div className="flex-1 overflow-hidden">
            <textarea 
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              onPaste={handlePaste}
              placeholder="What's on your mind?"
              className="w-full bg-transparent border-none text-white focus:ring-0 resize-none min-h-[48px] text-lg outline-none placeholder:text-white/30"
              rows={Math.max(2, newPostContent.split('\n').length)}
            />
            
            {attachment && (
              <div className="mt-2 relative inline-block">
                {attachment.type.startsWith('image/') ? (
                  <img src={URL.createObjectURL(attachment)} alt="Attachment preview" className="max-h-48 rounded-lg border border-white/10" />
                ) : attachment.type.startsWith('video/') ? (
                  <video src={URL.createObjectURL(attachment)} controls className="max-h-48 rounded-lg border border-white/10" />
                ) : (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/10 flex items-center gap-2">
                    <ImageIcon size={20} className="text-cyan-400" />
                    <span className="text-sm truncate max-w-[200px]">{attachment.name}</span>
                  </div>
                )}
                <button 
                  type="button" 
                  onClick={() => setAttachment(null)} 
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/10">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={(e) => e.target.files?.[0] && setAttachment(e.target.files[0])}
              />
              <button 
                type="button" 
                onClick={() => fileInputRef.current?.click()}
                className="text-white/40 hover:text-cyan-400 transition-colors"
              >
                <ImageIcon size={20} />
              </button>
              <button type="submit" disabled={(!newPostContent.trim() && !attachment) || isUploading} className="liquid-btn liquid-btn-primary px-6 py-2 text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isUploading ? 'Posting...' : <>Post <Send size={14} /></>}
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar flex flex-col gap-6 pb-6">
        {posts.map(post => (
          <div key={post.id} className="liquid-glass p-6 gravity-target animate-in slide-in-from-bottom-4 duration-500 relative" onMouseLeave={() => setShowOptionsFor(null)}>
            
            {post.authorId === currentUser?.uid && (
              <div className="absolute top-4 right-4 z-10">
                <button onClick={() => setShowOptionsFor(showOptionsFor === post.id ? null : post.id)} className="text-white/40 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5">
                  <MoreHorizontal size={20} />
                </button>
                {showOptionsFor === post.id && (
                  <div className="absolute right-0 top-full mt-1 bg-[#121218] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20 w-36">
                    <button 
                      onClick={() => { setEditingPostId(post.id); setEditContent(post.content); setShowOptionsFor(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button 
                      onClick={() => { handleDeletePost(post.id); setShowOptionsFor(null); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <img src={post.authorAvatar} alt={post.authorName} className="w-12 h-12 rounded-full border border-white/20 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-bold text-lg truncate">{post.authorName}</span>
                  <span className="text-white/40 text-sm whitespace-nowrap">
                    {post.timestamp?.toDate ? new Date(post.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'just now'}
                  </span>
                </div>
                
                {editingPostId === post.id ? (
                  <div className="mt-2">
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full bg-black/20 border border-white/10 rounded-lg p-3 text-white focus:ring-1 focus:ring-cyan-500 resize-none outline-none"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button onClick={() => setEditingPostId(null)} className="px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors text-white/70">Cancel</button>
                      <button onClick={() => handleEditPost(post.id)} className="px-4 py-1.5 rounded-lg text-sm font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 transition-colors">Save</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-white/90 leading-relaxed text-[15px] break-words whitespace-pre-wrap">{post.content}</p>
                )}

                {post.image && (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
                    {post.image.match(/\.(mp4|webm)$/i) || post.image.includes('/video/upload/') ? (
                      <video src={post.image} controls className="max-h-[400px] w-full bg-black/20" />
                    ) : post.image.match(/\.(pdf|doc|docx)$/i) || post.image.includes('/raw/upload/') ? (
                      <a href={post.image} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 bg-white/5 hover:bg-white/10 transition-colors">
                        <ImageIcon size={24} className="text-cyan-400" />
                        <span className="text-sm truncate">Download Attachment</span>
                      </a>
                    ) : (
                      <img src={post.image} alt="Post content" className="max-h-[400px] w-full object-cover" />
                    )}
                  </div>
                )}
                
                <div className="flex gap-6 mt-6 items-center flex-wrap">
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(post.reactions || {}).map(([emoji, users]) => (
                      <button 
                        key={emoji}
                        onClick={() => handleReaction(post.id, emoji, post.reactions)}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-sm transition-colors ${
                          users.includes(currentUser?.uid || '') ? 'bg-cyan-500/20 text-cyan-400' : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        <span>{emoji}</span>
                        <span className="font-medium text-xs">{users.length}</span>
                      </button>
                    ))}
                    <div className="relative group/react">
                      <button className="flex items-center gap-2 text-white/40 hover:text-cyan-400 transition-colors p-1.5 rounded-lg hover:bg-white/5">
                        <Smile size={18} />
                      </button>
                      <div className="absolute bottom-full left-0 mb-2 bg-[#121218] border border-white/10 rounded-xl shadow-xl p-2 hidden group-hover/react:flex gap-1 z-20">
                        {availableReactions.map(emoji => (
                          <button 
                            key={emoji} 
                            onClick={() => handleReaction(post.id, emoji, post.reactions)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 ml-auto">
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
