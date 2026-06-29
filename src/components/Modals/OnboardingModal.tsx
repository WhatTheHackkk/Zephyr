import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { Palette, Check, ArrowRight, User as UserIcon } from 'lucide-react';
import { uploadMedia } from '../../utils/uploadMedia';

export const OnboardingModal = () => {
  const { currentUser, setCurrentUser, theme, setTheme } = useAppContext();
  
  const [step, setStep] = useState(1);
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar || '');
  const [bio, setBio] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!currentUser) return null;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadMedia(file);
      setAvatarUrl(url);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        avatar: avatarUrl,
        bio: bio.trim(),
        profileCompleted: true
      });
      
      setCurrentUser({
        ...currentUser,
        avatar: avatarUrl,
        bio: bio.trim(),
        profileCompleted: true
      });
    } catch (err) {
      console.error("Failed to save onboarding", err);
    } finally {
      setIsSaving(false);
    }
  };

  const themes = [
    { id: 'cyan', name: 'Cyan', color: '#22d3ee' },
    { id: 'purple', name: 'Purple', color: '#c084fc' },
    { id: 'green', name: 'Green', color: '#4ade80' },
    { id: 'rose', name: 'Rose', color: '#fb7185' },
    { id: 'orange', name: 'Orange', color: '#fb923c' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-[#121218] border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500 relative flex flex-col items-center p-8 text-center">
        
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
          <div className="h-full bg-accent transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }}></div>
        </div>

        {step === 1 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 fade-in">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent mb-6 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <UserIcon size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Welcome to Zephyr!</h2>
            <p className="text-white/50 mb-8">Let's set up your profile. First, upload an avatar so people recognize you.</p>

            <label className="relative w-32 h-32 rounded-full border-4 border-white/10 overflow-hidden bg-black/40 flex items-center justify-center cursor-pointer hover:border-accent transition-all group mb-8 shadow-xl">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-white/30 uppercase">{currentUser.displayName?.charAt(0) || currentUser.username?.charAt(0) || '?'}</span>
              )}
              <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                {isUploading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : <span className="text-sm font-medium text-white">Upload</span>}
              </div>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileSelect} disabled={isUploading} />
            </label>

            <button onClick={() => setStep(2)} className="liquid-btn-primary w-full py-3.5 shadow-lg flex items-center justify-center gap-2 font-medium text-lg">
              Continue <ArrowRight size={20} />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 fade-in">
            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center text-accent mb-6 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Palette size={32} />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Pick your style</h2>
            <p className="text-white/50 mb-8">Choose an accent color that fits your vibe.</p>

            <div className="grid grid-cols-3 gap-4 w-full mb-8">
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${theme === t.id ? 'border-accent bg-accent/10 scale-105 shadow-lg' : 'border-white/10 hover:border-white/20 bg-black/40 hover:bg-black/60'}`}
                >
                  <div className="w-10 h-10 rounded-full shadow-lg flex items-center justify-center" style={{ backgroundColor: t.color }}>
                    {theme === t.id && <Check size={20} className="text-white" />}
                  </div>
                  <span className={`text-sm font-medium ${theme === t.id ? 'text-accent' : 'text-white/70'}`}>{t.name}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setStep(3)} className="liquid-btn-primary w-full py-3.5 shadow-lg flex items-center justify-center gap-2 font-medium text-lg">
              Almost done <ArrowRight size={20} />
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="w-full flex flex-col items-center animate-in slide-in-from-right-4 fade-in">
            <div className="w-32 h-32 rounded-full border-4 border-accent overflow-hidden shadow-[0_0_30px_rgba(34,211,238,0.3)] mb-6">
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-accent/20 flex items-center justify-center text-5xl font-bold text-accent uppercase">
                  {currentUser.displayName?.charAt(0) || currentUser.username?.charAt(0) || '?'}
                </div>
              )}
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Looking good!</h2>
            <p className="text-white/50 mb-8">Write a short bio so people can get to know you.</p>

            <textarea 
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder-white/30 focus:ring-1 focus:ring-accent resize-none outline-none mb-8 text-sm"
            />

            <button onClick={handleFinish} disabled={isSaving} className="liquid-btn-primary w-full py-3.5 shadow-lg flex items-center justify-center gap-2 font-medium text-lg">
              {isSaving ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : "Let's Go!"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
