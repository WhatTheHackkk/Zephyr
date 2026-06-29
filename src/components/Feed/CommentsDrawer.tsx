import React, { useState, useEffect } from 'react';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useAppContext } from '../../context/AppContext';
import UserAvatar from '../UserAvatar';
import { X, Send, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';

interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  timestamp: any;
}

interface CommentsDrawerProps {
  postId: string;
  onClose: () => void;
}

const CommentsDrawer: React.FC<CommentsDrawerProps> = ({ postId, onClose }) => {
  const { currentUser, allUsers } = useAppContext();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showOptionsFor, setShowOptionsFor] = useState<string | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, `posts/${postId}/comments`),
      orderBy('timestamp', 'asc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Comment[];
      setComments(commentsData);
    });
    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.username,
        authorAvatar: currentUser.avatar,
        content: newComment,
        timestamp: serverTimestamp()
      });
      setNewComment('');
    } catch (err) {
      console.error("Error adding comment:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!window.confirm("Delete this comment?")) return;
    try {
      await deleteDoc(doc(db, `posts/${postId}/comments`, commentId));
    } catch (err) {
      console.error("Error deleting comment:", err);
    }
  };

  const handleEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    try {
      await updateDoc(doc(db, `posts/${postId}/comments`, commentId), { content: editContent });
      setEditingCommentId(null);
    } catch (err) {
      console.error("Error editing comment:", err);
    }
  };

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[400px] bg-[#121218] border-l border-white/10 flex flex-col z-40 shadow-2xl animate-in slide-in-from-right-full duration-300">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20 shrink-0">
        <h3 className="font-bold text-lg text-white/90">Comments ({comments.length})</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar">
        {comments.map(comment => {
          const author = allUsers.find(u => u.uid === comment.authorId);
          const displayName = author?.displayName || comment.authorName;
          const avatar = author?.avatar || comment.authorAvatar;
          const status = author?.status || 'offline';
          
          return (
            <div key={comment.id} className="flex gap-3 group relative" onMouseLeave={() => setShowOptionsFor(null)}>
              <UserAvatar src={avatar} status={status as any} size="sm" className="mt-1 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="bg-white/5 rounded-2xl rounded-tl-none p-3 relative">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-white/90 truncate">{displayName}</span>
                    <span className="text-[10px] text-white/40">
                      {comment.timestamp?.toDate ? new Date(comment.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                    </span>
                  </div>
                  
                  {editingCommentId === comment.id ? (
                    <div className="mt-2">
                      <textarea 
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded p-2 text-white text-sm focus:ring-1 focus:ring-accent-dark resize-none outline-none"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setEditingCommentId(null)} className="px-2 py-1 rounded text-xs hover:bg-white/5 transition-colors text-white/70">Cancel</button>
                        <button onClick={() => handleEdit(comment.id)} className="px-2 py-1 rounded text-xs bg-accent-dark/20 text-accent hover:bg-accent-dark/40 transition-colors">Save</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/80 text-sm break-words whitespace-pre-wrap">{comment.content}</p>
                  )}
                </div>
              </div>

              {comment.authorId === currentUser?.uid && (
                <div className="absolute top-1 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setShowOptionsFor(showOptionsFor === comment.id ? null : comment.id)} className="text-white/40 hover:text-white p-1 rounded hover:bg-white/10">
                    <MoreHorizontal size={14} />
                  </button>
                  {showOptionsFor === comment.id && (
                    <div className="absolute right-0 top-full mt-1 bg-[#1a1a24] border border-white/10 rounded shadow-xl z-20 w-24 overflow-hidden">
                      <button 
                        onClick={() => { setEditingCommentId(comment.id); setEditContent(comment.content); setShowOptionsFor(null); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:text-white hover:bg-white/5"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => { handleDelete(comment.id); setShowOptionsFor(null); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {comments.length === 0 && (
          <div className="text-center text-white/30 text-sm mt-10">No comments yet.</div>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-black/20 shrink-0">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input 
            type="text" 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Write a comment..."
            className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-2 pr-10 text-sm text-white focus:outline-none focus:border-accent-dark/50"
            disabled={isSubmitting}
          />
          <button 
            type="submit" 
            disabled={!newComment.trim() || isSubmitting}
            className="absolute right-1 w-8 h-8 rounded-full bg-accent-dark/20 text-accent flex items-center justify-center hover:bg-accent-dark/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={14} className="ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentsDrawer;
