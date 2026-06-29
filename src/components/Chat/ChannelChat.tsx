import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { collection, addDoc, query, orderBy, onSnapshot, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import type { ChatMessage } from '../../types';
import { Send, Hash, MoreVertical, ChevronLeft, Plus, FileText } from 'lucide-react';

const ChannelChat = () => {
  const { currentUser, activeChannel, setMobileView } = useAppContext();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [typingNames, setTypingNames] = useState<string[]>([]);
  
  const [attachment, setAttachment] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeChannel) return;
    
    const q = query(
      collection(db, 'messages'), 
      where('channelId', '==', activeChannel),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ChatMessage[];
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
        <button className="text-white/40 hover:text-white transition-colors">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-5 flex flex-col gap-4">
        {messages.map(msg => (
          <div key={msg.id} className="flex gap-4 hover:bg-white/5 p-2 -mx-2 rounded-lg transition-colors group animate-in slide-in-from-bottom-2">
            <img src={msg.authorAvatar || '/default-avatar.png'} alt="Avatar" className="w-10 h-10 rounded-full border border-white/10 mt-0.5 object-cover shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-[14.5px] text-white/90 hover:underline cursor-pointer">{msg.authorName}</span>
                <span className="text-[11px] text-white/40">
                  {msg.timestamp?.toDate ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                </span>
              </div>
              <div className="text-white/85 text-[15px] leading-relaxed break-words mt-0.5 whitespace-pre-wrap">
                {msg.content && <div>{msg.content}</div>}
                {msg.attachmentUrl && renderAttachment(msg.attachmentUrl)}
              </div>
            </div>
          </div>
        ))}
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
              className="liquid-input w-full pr-12 text-sm h-10"
              disabled={isUploading}
            />
            <button 
              type="submit" 
              disabled={(!newMessage.trim() && !attachment) || isUploading} 
              className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} className="ml-0.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChannelChat;
