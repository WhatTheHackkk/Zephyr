import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, onSnapshot, where, serverTimestamp, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { ChatMessage } from '../../types';
import { Send, Hash, MoreVertical, ChevronLeft, Plus, FileText, Mic, Camera, X, Smile, Users, MoreHorizontal, Edit2, Trash2 } from 'lucide-react';
import UserAvatar from '../UserAvatar';
import EmojiPicker, { Theme } from 'emoji-picker-react';

const ChannelChat = () => {
  const { currentUser, activeChannel, setMobileView, allUsers } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingNames, setTypingNames] = useState<string[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [showOptionsFor, setShowOptionsFor] = useState<string | null>(null);
  const [showEmojiPickerForMessage, setShowEmojiPickerForMessage] = useState<string | null>(null);
  const messageEmojiPickerRef = useRef<HTMLDivElement>(null);
  const availableReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];
  
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

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
    
    return () => {
      unsubscribeMessages();
      unsubscribeTypingProper();
      clearInterval(checker);
    };
  }, [activeChannel, currentUser?.uid]);

  // Click outside listener for Emoji Picker
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (messageEmojiPickerRef.current && !messageEmojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPickerForMessage(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm("Are you sure you want to delete this message?")) return;
    try {
      await deleteDoc(doc(db, 'messages', msgId));
    } catch (err) {
      console.error("Error deleting message:", err);
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
        timestamp: serverTimestamp()
      });
      
      setNewMessage('');
      setAttachment(null);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachment(file);
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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setShowCamera(true);
      // Timeout needed for the modal to render and videoRef to become available
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 100);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Camera access denied or not available.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
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

  return (
    <div className="liquid-glass h-full flex flex-col gravity-target relative overflow-hidden">
      {/* Header */}
      <div className="p-4 md:p-5 border-b border-white/10 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-2">
          <button onClick={() => setMobileView('channels')} className="md:hidden text-white/70 hover:text-white transition-colors mr-1">
            <ChevronLeft size={24} />
          </button>
          <Hash size={20} className="text-cyan-400" />
          <h3 className="font-bold text-lg capitalize truncate max-w-[120px] md:max-w-none">{activeChannel}</h3>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setMobileView('members')} className="lg:hidden text-white/40 hover:text-white transition-colors">
            <Users size={20} />
          </button>
          <button className="text-white/40 hover:text-white transition-colors">
            <MoreVertical size={18} />
          </button>
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

          return (
            <div key={msg.id} className="flex gap-4 hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors group animate-in slide-in-from-bottom-2 relative" onMouseLeave={() => setShowOptionsFor(null)}>
              
              <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
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
                
                {msg.authorId === currentUser?.uid && (
                  <div className="relative">
                    <button onClick={() => setShowOptionsFor(showOptionsFor === msg.id ? null : msg.id)} className="text-white/40 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10">
                      <MoreHorizontal size={18} />
                    </button>
                    {showOptionsFor === msg.id && (
                      <div className="absolute right-0 top-full mt-1 bg-[#121218] border border-white/10 rounded-xl shadow-xl overflow-hidden z-20 w-32">
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
                      </div>
                    )}
                  </div>
                )}
              </div>

              <UserAvatar src={avatar} status={status as any} device={device as any} size="md" className="mt-0.5" />
              <div className="flex flex-col flex-1 min-w-0 pr-16">
                <div className="flex items-baseline gap-2">
                  <span className="font-bold text-[14.5px] text-white/90 hover:underline cursor-pointer truncate">{displayName}</span>
                  <span className="text-[11px] text-white/40 shrink-0">
                    {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </span>
                </div>
              
              {editingMessageId === msg.id ? (
                <div className="mt-1">
                  <textarea 
                    value={editMessageContent}
                    onChange={(e) => setEditMessageContent(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg p-2 text-white focus:ring-1 focus:ring-cyan-500 resize-none outline-none text-sm"
                    rows={2}
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button onClick={() => setEditingMessageId(null)} className="px-3 py-1 rounded text-xs hover:bg-white/5 transition-colors text-white/70">Cancel</button>
                    <button onClick={() => handleEditMessage(msg.id)} className="px-3 py-1 rounded text-xs bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/40 transition-colors">Save</button>
                  </div>
                </div>
              ) : (
                <div className="text-white/85 text-[15px] leading-relaxed break-words mt-0.5 whitespace-pre-wrap">
                  {msg.content && <div>{msg.content}</div>}
                  {msg.attachmentUrl && renderAttachment(msg.attachmentUrl)}
                </div>
              )}
              
              {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-1">
                  {Object.entries(msg.reactions).map(([emoji, users]) => (
                    <button 
                      key={emoji}
                      onClick={() => handleReaction(msg.id, emoji, msg.reactions)}
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                        users.includes(currentUser?.uid || '') ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
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
          <div className="absolute -top-6 left-6 text-xs text-cyan-400 font-medium animate-pulse flex items-center gap-2">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
            </div>
            {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        {attachment && (
          <div className="mb-3 flex items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-lg w-fit relative animate-in zoom-in-95">
            <div className="text-cyan-400"><FileText size={20} /></div>
            <span className="text-sm text-white/80 max-w-[200px] truncate">{attachment.name}</span>
            <button onClick={() => setAttachment(null)} className="ml-2 w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/40">
              <ChevronLeft size={12} className="rotate-45" /> {/* Close X using Chevron */}
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
              placeholder={`Message #${activeChannel}`}
              className="liquid-input w-full pr-[160px] text-sm h-10"
              disabled={isUploading || isRecordingAudio}
            />
            
            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
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
                    onClick={startCamera}
                    className="w-8 h-8 rounded-full bg-white/5 text-white/70 flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors"
                  >
                    <Camera size={16} />
                  </button>
                </>
              )}
              
              <button 
                type="submit" 
                disabled={(!newMessage.trim() && !attachment) || isUploading || isRecordingAudio} 
                className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ml-1"
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
            <div className="p-4 bg-black/40 flex justify-center border-t border-white/10">
              <button 
                onClick={takePhoto}
                className="w-14 h-14 rounded-full border-4 border-white/20 bg-white/10 hover:bg-white hover:border-white transition-all flex items-center justify-center"
              >
                <div className="w-10 h-10 rounded-full bg-transparent hover:bg-white/20 transition-all"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChannelChat;
