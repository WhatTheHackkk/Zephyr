import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, where, serverTimestamp, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import type { ChatMessage } from '../../types';
import { Send, Hash, MoreVertical, ChevronLeft, Plus, FileText, Mic, Camera, Video, X, Smile, Users, MoreHorizontal, Edit2, Trash2, MessageSquare } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { GifPicker } from './GifPicker';
import UserProfileModal from '../Modals/UserProfileModal';

const ChannelChat = () => {
  const { currentUser, activeChannel, setActiveChannel, setMobileView, allUsers, leftSidebarOpen, setLeftSidebarOpen } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [profileModalUserId, setProfileModalUserId] = useState<string | null>(null);
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const gifPickerRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [showOptionsFor, setShowOptionsFor] = useState<string | null>(null);
  const [showEmojiPickerForMessage, setShowEmojiPickerForMessage] = useState<string | null>(null);
  const [unhiddenBlockedMessages, setUnhiddenBlockedMessages] = useState<string[]>([]);
  const [showChannelMenu, setShowChannelMenu] = useState(false);
  const [isChannelLocked, setIsChannelLocked] = useState(false);
  const messageEmojiPickerRef = useRef<HTMLDivElement>(null);
  
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraMode, setCameraMode] = useState<'photo' | 'video'>('photo');
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  
  const startDM = async (friendId: string) => {
    if (!currentUser) return;
    const dmId = `dm_${[currentUser.uid, friendId].sort().join('_')}`;

    if (!currentUser.activeDMs?.includes(friendId)) {
      const newDMs = [...(currentUser.activeDMs || []), friendId];
      await updateDoc(doc(db, 'users', currentUser.uid), { activeDMs: newDMs });
    }
    
    setActiveChannel(dmId);
    setMobileView('chat');
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChannel) {
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
        setLeftSidebarOpen(false);
      }
    }
  }, [activeChannel, setLeftSidebarOpen]);

  useEffect(() => {
    if (!activeChannel) return;
    
    const q = query(
      collection(db, 'messages'), 
      where('channelId', '==', activeChannel)
    );
    
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
      
      msgs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
        const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
        return timeA - timeB;
      });
      
      setMessages(msgs);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    
    // Typing listener
    const typingRef = doc(db, 'typing', activeChannel);
    onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const now = Date.now();
        const names = Object.entries(data)
          .filter(([uid, info]: any) => uid !== currentUser?.uid && (now - info.timestamp) < 3000)
          .map(([_, info]: any) => info.username);
        setTypingNames(names);
      }
    });
    
    let lastData: any = null;
    const unsubscribeTypingProper = onSnapshot(typingRef, (docSnap) => {
      if (docSnap.exists()) {
        lastData = docSnap.data();
      } else {
        lastData = null;
      }
    });

    const checker = setInterval(() => {
      if (lastData) {
        const now = Date.now();
        const names = Object.entries(lastData)
          .filter(([uid, info]: any) => uid !== currentUser?.uid && (now - info.timestamp) < 3000)
          .map(([_, info]: any) => info.username);
        setTypingNames(names);
      }
    }, 1000);
    
    // Channel lock listener
    const channelRef = doc(db, 'channels', activeChannel);
    const unsubscribeChannel = onSnapshot(channelRef, (docSnap) => {
      if (docSnap.exists()) {
        setIsChannelLocked(docSnap.data().isLocked || false);
      } else {
        setIsChannelLocked(false);
      }
    });
    
    return () => {
      unsubscribeMessages();
      unsubscribeTypingProper();
      unsubscribeChannel();
      clearInterval(checker);
    };
  }, [activeChannel, currentUser?.uid]);

  // Click outside listener for Emoji Picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(event.target as Node)) {
        setShowGifPicker(false);
      }
      if (messageEmojiPickerRef.current && !messageEmojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPickerForMessage(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteMessage = async (msgId: string) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await deleteDoc(doc(db, 'messages', msgId));
      } catch (err) {
        console.error("Error deleting message", err);
      }
    }
  };

  const handleClearChat = async () => {
    if (!currentUser?.isAdmin) return;
    if (window.confirm(`Are you sure you want to clear all messages in ${chatTitle}?`)) {
      try {
        const q = query(collection(db, 'messages'), where('channelId', '==', activeChannel));
        const snap = await getDocs(q);
        const deletePromises = snap.docs.map((d: any) => deleteDoc(doc(db, 'messages', d.id)));
        await Promise.all(deletePromises);
        setShowChannelMenu(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleToggleLockChat = async () => {
    if (!currentUser?.isAdmin) return;
    try {
      await setDoc(doc(db, 'channels', activeChannel), {
        isLocked: !isChannelLocked
      }, { merge: true });
      setShowChannelMenu(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditMessage = async (msgId: string) => {
    if (!editMessageContent.trim()) return;
    try {
      await updateDoc(doc(db, 'messages', msgId), { content: editMessageContent });
      setEditingMessageId(null);
    } catch (err) {
      console.error("Error editing message:", err);
    }
  };

  const handleReaction = async (msgId: string, emoji: string, currentReactions: Record<string, string[]> = {}) => {
    if (!currentUser) return;
    try {
      const msgRef = doc(db, 'messages', msgId);
      const newReactions = { ...currentReactions };
      if (!newReactions[emoji]) newReactions[emoji] = [];
      
      const userIndex = newReactions[emoji].indexOf(currentUser.uid);
      if (userIndex > -1) {
        newReactions[emoji].splice(userIndex, 1);
        if (newReactions[emoji].length === 0) delete newReactions[emoji];
      } else {
        newReactions[emoji].push(currentUser.uid);
      }
      await updateDoc(msgRef, { reactions: newReactions });
    } catch (err) {
      console.error("Error updating reaction:", err);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChannelLocked && !currentUser?.isAdmin) return;
    if ((!newMessage.trim() && !attachment) || !currentUser || isUploading) return;

    setIsUploading(true);
    let attachmentUrl = '';

    try {
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        formData.append('upload_preset', 'wbqanc91');
        
        const res = await fetch('https://api.cloudinary.com/v1_1/dixvtzmjd/auto/upload', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        
        if (!res.ok) throw new Error(data.error?.message || 'Upload failed');
        attachmentUrl = data.secure_url;
      }

      await addDoc(collection(db, 'messages'), {
        authorId: currentUser.uid,
        authorName: currentUser.displayName || currentUser.username,
        authorAvatar: currentUser.avatar,
        channelId: activeChannel,
        content: newMessage,
        attachmentUrl,
        replyToId: replyingTo?.id || null,
        replyToContent: replyingTo?.content || null,
        replyToAuthor: replyingTo?.authorName || null,
        timestamp: serverTimestamp()
      });
      
      await setDoc(doc(db, 'channel_meta', activeChannel), {
        lastMessageAt: serverTimestamp()
      }, { merge: true });
      
      setNewMessage('');
      setAttachment(null);
      setReplyingTo(null);
    } catch (err) {
      console.error("Error sending message: ", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleTyping = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    if (!currentUser) return;
    
    try {
      const typingRef = doc(db, 'typing', activeChannel);
      await setDoc(typingRef, {
        [currentUser.uid]: {
          username: currentUser.displayName || currentUser.username,
          timestamp: Date.now()
        }
      }, { merge: true });
    } catch (err) {
      console.error("Typing indicator error: ", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only set to false if we are leaving the main container (not children)
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        setAttachment(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file) {
        setAttachment(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          setAttachment(blob);
          e.preventDefault();
        }
      }
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([audioBlob], `audio_${Date.now()}.webm`, { type: 'audio/webm' });
        setAttachment(file);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access denied or not available.");
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const startCamera = async (mode: 'photo' | 'video' = 'photo') => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: mode === 'video' });
      streamRef.current = stream;
      setCameraMode(mode);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access denied or no camera found on this device.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    if (isRecordingVideo && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
    }
  };

  const toggleRecordingVideo = () => {
    if (isRecordingVideo && mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecordingVideo(false);
      stopCamera();
    } else if (streamRef.current) {
      const mediaRecorder = new MediaRecorder(streamRef.current);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const videoBlob = new Blob(audioChunksRef.current, { type: 'video/webm' });
        const file = new File([videoBlob], `video_${Date.now()}.webm`, { type: 'video/webm' });
        setAttachment(file);
      };

      mediaRecorder.start();
      setIsRecordingVideo(true);
    }
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setAttachment(file);
            stopCamera();
          }
        }, 'image/jpeg');
      }
    }
  };

  const renderAttachment = (url: string) => {
    if (!url) return null;
    const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('video');
    
    if (isVideo) {
      return (
        <video src={url} controls className="max-w-sm rounded-lg mt-2 border border-white/10" />
      );
    } else {
      return (
        <img src={url} alt="Attachment" className="max-w-sm rounded-lg mt-2 border border-white/10 object-cover" />
      );
    }
  };

  const renderContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        const ytMatch = part.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        if (ytMatch) {
          return (
            <div key={i} className="mt-2 mb-2 block">
              <iframe 
                width="100%" 
                height="240" 
                src={`https://www.youtube.com/embed/${ytMatch[1]}`} 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowFullScreen
                className="rounded-lg max-w-[400px]"
              ></iframe>
            </div>
          );
        }
        if (part.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i)) {
          return (
            <div key={i} className="mt-2 mb-2 block">
              <a href={part} target="_blank" rel="noreferrer" className="inline-block">
                <img src={part} alt="link preview" className="max-h-64 rounded-lg object-contain bg-black/20 hover:opacity-90 transition-opacity" />
              </a>
            </div>
          );
        }
        return <a key={i} href={part} target="_blank" rel="noreferrer" className="text-accent hover:underline break-all">{part}</a>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const isDM = activeChannel?.startsWith('dm_');
  let chatTitle = activeChannel;
  let chatIcon = <Hash size={20} className="text-accent" />;
  if (isDM && currentUser) {
    const uids = activeChannel.replace('dm_', '').split('_');
    const otherUid = uids.find(id => id !== currentUser.uid);
    const otherUser = allUsers.find(u => u.uid === otherUid);
    chatTitle = otherUser ? (otherUser.displayName || otherUser.username) : 'Direct Message';
    chatIcon = <Users size={20} className="text-accent" />;
  }

  return (
    <div 
      className="liquid-glass h-full flex flex-col gravity-target relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm border-2 border-accent border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 px-8 py-6 rounded-2xl flex flex-col items-center gap-4 text-accent shadow-2xl shadow-accent-dark/20">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <h2 className="text-xl font-bold">Drop files to attach</h2>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              setMobileView('channels');
              setLeftSidebarOpen(!leftSidebarOpen);
            }} 
            className="text-white/70 hover:text-white transition-colors mr-1"
          >
            <ChevronLeft size={24} className="md:hidden" />
            <div className="hidden md:block">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
            </div>
          </button>
          {chatIcon}
          <h3 className="font-bold text-lg capitalize truncate max-w-[120px] md:max-w-none">{chatTitle}</h3>
        </div>
        <div className="flex items-center gap-4 relative">
          <button onClick={() => setMobileView('members')} className="lg:hidden text-white/40 hover:text-white transition-colors">
            <Users size={20} />
          </button>
          
          <button 
            onClick={() => setShowChannelMenu(!showChannelMenu)}
            className={`text-white/40 hover:text-white transition-colors ${showChannelMenu ? 'text-white' : ''}`}
          >
            <MoreVertical size={18} />
          </button>

          {showChannelMenu && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a24] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
              {currentUser?.isAdmin ? (
                <>
                  <button 
                    onClick={handleToggleLockChat}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors text-left"
                  >
                    {isChannelLocked ? 'Unlock Chat' : 'Lock Chat'}
                  </button>
                  <div className="my-1 border-t border-white/5"></div>
                  <button 
                    onClick={handleClearChat}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors text-left font-medium"
                  >
                    <Trash2 size={14} /> Clear Chat
                  </button>
                </>
              ) : (
                <div className="px-3 py-2 text-sm text-white/40 text-center italic">
                  No options available
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-5 flex flex-col gap-4">
        {messages.map(msg => {
          const author = allUsers.find(u => u.uid === msg.authorId);
          const displayName = author?.displayName || msg.authorName;
          const avatar = author?.avatar || msg.authorAvatar;
          const status = author?.status || 'offline';
          const device = author?.device;
          const isCurrentUser = msg.authorId === currentUser?.uid;
          const isDMMsg = isDM && isCurrentUser;
          const isBlocked = currentUser?.blockedUsers?.includes(msg.authorId) || false;
          const isUnhidden = unhiddenBlockedMessages.includes(msg.id);

          if (isBlocked && !isUnhidden) {
            return (
              <div key={msg.id} className="flex gap-2 items-center hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors group animate-in slide-in-from-bottom-2">
                <div className="w-10 h-10 shrink-0 flex items-center justify-center">
                  <div className="w-4 h-4 bg-red-500/20 rounded text-red-500 flex items-center justify-center text-[10px] font-bold border border-red-500/30">!</div>
                </div>
                <div className="flex-1 text-sm text-white/40 italic">
                  1 Blocked Message
                </div>
                <button 
                  onClick={() => setUnhiddenBlockedMessages(prev => [...prev, msg.id])}
                  className="text-xs font-medium text-white/50 hover:text-white px-2 py-1 rounded bg-black/40 hover:bg-black/60 transition-colors"
                >
                  Show Message
                </button>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex gap-4 hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors group animate-in slide-in-from-bottom-2 relative ${isDMMsg ? 'flex-row-reverse text-right' : ''}`} onMouseLeave={() => setShowOptionsFor(null)}>
              
                <div className={`absolute top-2 z-10 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity ${isDMMsg ? 'left-2' : 'right-2'}`}>
                  <button onClick={() => setReplyingTo(msg)} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10" title="Reply">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                  </button>
                  <div className="relative" ref={showEmojiPickerForMessage === msg.id ? messageEmojiPickerRef : null}>
                    <button onClick={() => setShowEmojiPickerForMessage(showEmojiPickerForMessage === msg.id ? null : msg.id)} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
                      <Smile size={18} />
                    </button>
                    {showEmojiPickerForMessage === msg.id && (
                      <div className="absolute right-0 top-full mt-1 z-50">
                        <EmojiPicker 
                          theme={Theme.DARK} 
                          onEmojiClick={(emojiData) => {
                            handleReaction(msg.id, emojiData.emoji, msg.reactions);
                            setShowEmojiPickerForMessage(null);
                          }} 
                        />
                      </div>
                    )}
                  </div>
                  
                  <div className="relative">
                    <button onClick={() => setShowOptionsFor(showOptionsFor === msg.id ? null : msg.id)} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
                      <MoreHorizontal size={18} />
                    </button>
                    {showOptionsFor === msg.id && (
                      <div className={`absolute ${isDMMsg ? 'left-0' : 'right-0'} top-full mt-1 bg-[#121218] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20 w-40`}>
                        {msg.authorId === currentUser?.uid ? (
                          <>
                            <button 
                              onClick={() => { setEditingMessageId(msg.id); setEditMessageContent(msg.content); setShowOptionsFor(null); }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                            >
                              <Edit2 size={14} /> Edit
                            </button>
                            <button 
                              onClick={() => { handleDeleteMessage(msg.id); setShowOptionsFor(null); }}
                              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => { startDM(msg.authorId); setShowOptionsFor(null); }}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-accent hover:text-accent hover:bg-accent-dark/10 transition-colors"
                          >
                            <MessageSquare size={14} /> Send a message
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              <div 
                className="w-10 h-10 rounded-full bg-black/40 border border-white/5 overflow-hidden shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setProfileModalUserId(msg.authorId)}
              >
                <UserAvatar src={avatar} status={status as any} device={device as any} size="md" className="mt-0.5" />
              </div>
              
              <div className="flex flex-col flex-1 min-w-0 pr-16">
                <div className={`flex items-baseline gap-2 ${isDMMsg ? 'flex-row-reverse' : ''}`}>
                  <span className="font-bold text-[14.5px] text-white/90 hover:underline cursor-pointer truncate" onClick={() => setProfileModalUserId(msg.authorId)}>{displayName}</span>
                  <span className="text-[11px] text-white/40 shrink-0">
                    {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              
              {msg.replyToId && (
                <div className={`flex items-center gap-2 mt-1 mb-1 text-white/50 text-xs border-white/10 cursor-pointer hover:text-white/70 ${isDMMsg ? 'flex-row-reverse border-r-2 pr-2' : 'border-l-2 pl-2'}`}>
                  <div className="font-semibold">{msg.replyToAuthor}</div>
                  <div className="truncate max-w-[200px] md:max-w-md">{msg.replyToContent}</div>
                </div>
              )}
              
              {editingMessageId === msg.id ? (
                <div className="mt-1">
                  <textarea 
                    value={editMessageContent}
                    onChange={(e) => setEditMessageContent(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:ring-1 focus:ring-accent-dark resize-none outline-none text-sm"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button onClick={() => setEditingMessageId(null)} className="px-3 py-1 rounded text-xs hover:bg-white/5 transition-colors text-white/70">Cancel</button>
                    <button onClick={() => handleEditMessage(msg.id)} className="px-3 py-1 rounded text-xs bg-accent-dark/20 text-accent hover:bg-accent-dark/40 transition-colors">Save</button>
                  </div>
                </div>
              ) : (
                <div className="text-white/85 text-[15px] leading-relaxed break-words mt-0.5 whitespace-pre-wrap">
                  {msg.content && <div>{renderContent(msg.content)}</div>}
                  {msg.attachmentUrl && renderAttachment(msg.attachmentUrl)}
                </div>
              )}
              
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className={`flex gap-1.5 flex-wrap mt-1 ${isDMMsg ? 'justify-end' : ''}`}>
                  {Object.entries(msg.reactions).map(([emoji, users]) => (
                    <button 
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji, msg.reactions)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                        users.includes(currentUser?.uid || '') ? 'bg-accent-dark/20 text-accent border border-accent-dark/30' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-medium text-[10px]">{users.length}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )})}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black/20 border-t border-white/10 relative flex flex-col">
        {typingNames.length > 0 && (
          <div className="absolute -top-6 left-6 text-xs text-accent font-medium animate-pulse flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {attachment && (
          <div className="mb-3 flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-lg w-fit relative animate-in zoom-in-95">
            <div className="text-accent"><FileText size={20} /></div>
            <span className="text-sm text-white/80 max-w-[200px] truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="ml-2 w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40">
              <ChevronLeft size={12} className="rotate-45" />
            </button>
          </div>
        )}

        {replyingTo && (
          <div className="mb-3 flex items-center justify-between bg-black/40 border-l-2 border-accent p-2 rounded-r-lg text-sm w-full">
            <div className="flex items-center gap-2 truncate text-white/70">
              <span className="font-semibold text-white/90">Replying to {replyingTo.authorName}:</span>
              <span className="truncate">{replyingTo.content}</span>
            </div>
            <button onClick={() => setReplyingTo(null)} className="ml-2 text-white/40 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Plus size={20} className="text-white/70" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
            accept="image/*,video/mp4,video/webm"
          />

          <div className="relative flex-1">
            <input 
              type="text" 
              value={newMessage}
              onChange={handleTyping}
              onPaste={handlePaste}
              placeholder={isChannelLocked && !currentUser?.isAdmin ? "This channel is locked" : (isDM ? `Message @${chatTitle}` : `Message #${activeChannel}`)}
              className="liquid-input w-full pr-[160px] text-sm h-10"
              disabled={isUploading || isRecordingAudio || (isChannelLocked && !currentUser?.isAdmin)}
            />
            
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <div className="relative" ref={gifPickerRef}>
                <button
                  type="button"
                  onClick={() => setShowGifPicker(!showGifPicker)}
                  className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors text-xs font-bold"
                >
                  GIF
                </button>
                {showGifPicker && (
                  <GifPicker 
                    onGifSelect={(url) => {
                      setNewMessage(prev => prev + (prev ? ' ' : '') + url);
                      setShowGifPicker(false);
                    }} 
                  />
                )}
              </div>

              <div className="relative" ref={emojiPickerRef}>
                <button 
                  type="button" 
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Smile size={16} />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 z-50">
                    <EmojiPicker 
                      theme={Theme.DARK} 
                      onEmojiClick={(emojiData) => {
                        setNewMessage(prev => prev + emojiData.emoji);
                        setShowEmojiPicker(false);
                      }} 
                    />
                  </div>
                )}
              </div>

              {isRecordingAudio ? (
                <button
                  type="button"
                  onClick={stopAudioRecording}
                  className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40 transition-colors animate-pulse"
                >
                  <div className="w-2.5 h-2.5 rounded-sm bg-red-400"></div>
                </button>
              ) : (
                <>
                  <button 
                    type="button" 
                    onClick={startAudioRecording}
                    className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Mic size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => startCamera('photo')}
                    className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Camera size={16} />
                  </button>
                  <button 
                    type="button" 
                    onClick={() => startCamera('video')}
                    className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Video size={16} />
                  </button>
                </>
              )}
              
              <button 
                type="submit" 
                disabled={(!newMessage.trim() && !attachment) || isUploading || isRecordingAudio || (isChannelLocked && !currentUser?.isAdmin)} 
                className="w-8 h-8 rounded-full bg-accent-dark/20 text-accent flex items-center justify-center hover:bg-accent-dark/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1"
              >
                <Send size={14} className="ml-0.5" />
              </button>
            </div>
          </div>
        </form>
      </div>
      
      {/* Camera Modal */}
      {showCamera && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
          <div className="relative bg-[#121218] rounded-xl border border-white/10 overflow-hidden shadow-2xl max-w-2xl w-full">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
              <h3 className="font-bold text-white">Camera</h3>
              <button onClick={stopCamera} className="text-white/40 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="relative bg-black aspect-video flex items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 bg-black/40 flex justify-center border-t border-white/10 gap-4">
              {cameraMode === 'photo' ? (
                <button 
                  onClick={takePhoto}
                  className="w-14 h-14 rounded-full border-4 border-white/20 bg-white/10 hover:bg-white hover:border-white transition-all flex items-center justify-center"
                >
                  <div className="w-10 h-10 rounded-full bg-transparent hover:bg-white/20 transition-all"></div>
                </button>
              ) : (
                <button 
                  onClick={toggleRecordingVideo}
                  className={`w-14 h-14 rounded-full border-4 ${isRecordingVideo ? 'border-red-500/20 bg-red-500/10' : 'border-white/20 bg-white/10 hover:bg-white hover:border-white'} transition-all flex items-center justify-center`}
                >
                  <div className={`transition-all ${isRecordingVideo ? 'w-6 h-6 rounded bg-red-500' : 'w-10 h-10 rounded-full bg-red-500 hover:bg-red-600'}`}></div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {profileModalUserId && <UserProfileModal userId={profileModalUserId} onClose={() => setProfileModalUserId(null)} />}
    </div>
  );
};

export default ChannelChat;
