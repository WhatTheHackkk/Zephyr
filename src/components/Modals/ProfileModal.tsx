import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db, auth } from '../../lib/firebase';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { UploadCloud, X } from 'lucide-react';
import ImageCropperModal from './ImageCropperModal';
import { uploadMedia } from '../../utils/uploadMedia';

interface ProfileModalProps {
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { currentUser, setCurrentUser, theme, setTheme } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'account' | 'appearance'>('account');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [customStatus, setCustomStatus] = useState(currentUser?.customStatus || '');
  const [status, setStatus] = useState(currentUser?.status || 'online');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [banner, setBanner] = useState(currentUser?.banner || '');
  
  const [password, setPassword] = useState('');
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState<'avatar' | 'banner' | null>(null);

  // Cropper state
  const [cropperData, setCropperData] = useState<{ src: string; type: 'avatar' | 'banner' } | null>(null);

  if (!currentUser) return null;

  const uploadToCloudinary = async (file: File, type: 'avatar' | 'banner') => {
    try {
      setIsUploading(type);
      const url = await uploadMedia(file);
      
      if (type === 'avatar') setAvatar(url);
      else setBanner(url);
    } catch (err: any) {
      console.error("Upload error", err);
      setError(`Failed to upload ${type}: ${err.message}`);
    } finally {
      setIsUploading(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;

    // For videos, skip cropper and upload directly
    if (file.type.startsWith('video/')) {
      uploadToCloudinary(file, type);
      return;
    }

    // For images, open cropper
    const imageUrl = URL.createObjectURL(file);
    setCropperData({ src: imageUrl, type });
  };

  const handleCropComplete = (croppedFile: File) => {
    if (!cropperData) return;
    uploadToCloudinary(croppedFile, cropperData.type);
    setCropperData(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    
    try {
      const cleanUsername = username.toLowerCase().trim();

      // If username changed, verify uniqueness and password
      if (cleanUsername !== currentUser.username) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('username', '==', cleanUsername));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          throw new Error('Username is already taken');
        }

        if (!password) {
          setRequiresPassword(true);
          setIsSaving(false);
          return;
        }

        if (auth.currentUser && currentUser.email) {
          const credential = EmailAuthProvider.credential(currentUser.email, password);
          await reauthenticateWithCredential(auth.currentUser, credential);
        }
      }
      
      const userRef = doc(db, 'users', currentUser.uid);
      const updates = {
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        customStatus: customStatus.trim(),
        status,
        avatar,
        banner
      };
      
      await updateDoc(userRef, updates);
      
      setCurrentUser({
        ...currentUser,
        ...updates
      });
      
      onClose();
    } catch (err: any) {
      console.error("Error updating profile: ", err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderMedia = (url: string, className: string) => {
    if (!url) return <div className={`bg-white/5 ${className}`}></div>;
    const isVideo = url.includes('.mp4') || url.includes('.webm');
    if (isVideo) {
      return <video src={url} autoPlay loop muted playsInline className={`object-cover ${className}`} />;
    }
    return <img src={url} alt="Media" className={`object-cover ${className}`} />;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#111116] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 relative">
        
        <button onClick={onClose} className="absolute top-4 right-4 z-10 p-1 bg-black/50 text-white/70 hover:text-white transition-colors rounded-full hover:bg-black/80">
          <X size={20} />
        </button>

        {/* Header & Avatar Wrapper */}
        <div className="relative shrink-0">
          {/* Banner */}
          <div className="relative h-32 bg-black/30 group z-10">
            {renderMedia(banner, "w-full h-full")}
            <label className={`absolute top-2 right-2 p-2 bg-black/60 rounded-full cursor-pointer hover:bg-black/80 transition-all backdrop-blur-sm z-20 ${isUploading === 'banner' ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
              <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => handleFileSelect(e, 'banner')} disabled={isUploading !== null} />
              {isUploading === 'banner' ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <UploadCloud size={20} className="text-white" />}
            </label>
          </div>

          {/* Avatar (Absolute positioned over the boundary) */}
          <div className="absolute left-6 -bottom-12 z-50">
            <div className="relative w-24 h-24 rounded-full border-4 border-[#111116] overflow-hidden bg-black group shadow-lg">
              {renderMedia(avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser.uid}`, "w-full h-full")}
              <label className={`absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer hover:bg-black/60 transition-all ${isUploading === 'avatar' ? 'opacity-100' : 'opacity-100 md:opacity-0 md:group-hover:opacity-100'}`}>
                <input type="file" accept="image/*,video/mp4,video/webm" className="hidden" onChange={(e) => handleFileSelect(e, 'avatar')} disabled={isUploading !== null} />
                {isUploading === 'avatar' ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <UploadCloud size={24} className="text-white shadow-lg drop-shadow-lg" />}
              </label>
            </div>
            <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-4 border-[#111116] ${
              status === 'online' ? 'bg-green-500' :
              status === 'idle' ? 'bg-yellow-500' :
              status === 'dnd' ? 'bg-red-500' : 'bg-gray-500'
            }`}></div>
          </div>
        </div>

        {/* Spacer & Tabs */}
        <div className="h-14 shrink-0 flex items-end justify-end px-6 border-b border-white/5">
          <div className="flex gap-6">
            <button 
              onClick={() => setActiveTab('account')} 
              className={`text-sm font-medium pb-3 border-b-2 transition-all ${activeTab === 'account' ? 'border-accent text-accent' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              Account
            </button>
            <button 
              onClick={() => setActiveTab('appearance')} 
              className={`text-sm font-medium pb-3 border-b-2 transition-all ${activeTab === 'appearance' ? 'border-accent text-accent' : 'border-transparent text-white/50 hover:text-white/80'}`}
            >
              Appearance
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto min-h-[50vh] hide-scrollbar relative">
          
          {activeTab === 'account' && (
          <form id="profile-form" onSubmit={handleSave} className="flex flex-col gap-5">

            {error && <div className="p-3 rounded bg-red-500/20 text-red-400 text-sm border border-red-500/30">{error}</div>}

            {requiresPassword && (
              <div className="p-4 rounded-xl bg-accent-dark/10 border border-accent-dark/30 animate-in slide-in-from-top-2">
                <p className="text-sm text-accent mb-3">Please enter your password to confirm username change.</p>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="liquid-input w-full" 
                  placeholder="Current Password" 
                  required
                />
              </div>
            )}

            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">Display Name</label>
                <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="liquid-input w-full" placeholder="John Doe" />
              </div>
              <div>
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">Username</label>
                <input type="text" value={username} onChange={e => { setUsername(e.target.value); setRequiresPassword(false); }} className="liquid-input w-full" placeholder="johndoe" required pattern="^\S+$" title="No spaces allowed" />
              </div>
            </div>

            {/* Status Indicator */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">Online Status</label>
              <div className="grid grid-cols-3 gap-2">
                {(['online', 'idle', 'dnd'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`py-2 rounded-xl border text-sm capitalize flex items-center justify-center gap-2 transition-all ${
                      status === s ? 'bg-white/10 border-white/20 text-white shadow-md' : 'bg-transparent border-white/5 text-white/40 hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      s === 'online' ? 'bg-green-500' :
                      s === 'idle' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Status */}
            <div>
              <div className="flex justify-between items-end mb-1">
                <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block">Custom Status</label>
                <span className={`text-xs ${customStatus.length > 200 ? 'text-red-400' : 'text-white/30'}`}>{customStatus.length}/200</span>
              </div>
              <input 
                type="text" 
                value={customStatus} 
                onChange={e => setCustomStatus(e.target.value)} 
                maxLength={200}
                className="liquid-input w-full" 
                placeholder="What's on your mind?" 
              />
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1 block">About Me</label>
              <textarea 
                value={bio} 
                onChange={e => setBio(e.target.value)} 
                className="liquid-input w-full min-h-[100px] resize-none" 
                placeholder="Tell us a little about yourself..." 
              />
            </div>

          </form>
          )}

          {activeTab === 'appearance' && (
            <div className="flex flex-col gap-6 animate-in slide-in-from-right-4 fade-in">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Theme Color</h3>
                <p className="text-sm text-white/50 mb-4">Choose your favorite accent color. This will update the entire app instantly.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'cyan', name: 'Cyan', color: '#22d3ee' },
                    { id: 'purple', name: 'Purple', color: '#c084fc' },
                    { id: 'green', name: 'Green', color: '#4ade80' },
                    { id: 'rose', name: 'Rose', color: '#fb7185' },
                    { id: 'orange', name: 'Orange', color: '#fb923c' }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${theme === t.id ? 'border-accent bg-accent/10 scale-105' : 'border-white/10 hover:border-white/20 bg-black/40 hover:bg-black/60'}`}
                    >
                      <div className="w-8 h-8 rounded-full shadow-lg" style={{ backgroundColor: t.color }}></div>
                      <span className={`text-sm font-medium ${theme === t.id ? 'text-accent' : 'text-white/70'}`}>{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/40 flex justify-end gap-3 z-10 relative">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all font-medium">Cancel</button>
          <button 
            type="submit" 
            form="profile-form" 
            disabled={isSaving || customStatus.length > 200 || !username.trim()} 
            className="liquid-btn liquid-btn-primary px-6 py-2 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : (requiresPassword ? 'Confirm Password' : 'Save Changes')}
          </button>
        </div>

      </div>
      
      {cropperData && (
        <ImageCropperModal
          imageSrc={cropperData.src}
          aspectRatio={cropperData.type === 'avatar' ? 1 : 16 / 9}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropperData(null)}
        />
      )}
    </div>
  );
};

export default ProfileModal;
