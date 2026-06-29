import React, { useState } from 'react';
import { GifPicker as ReactGifPicker, Theme } from 'gif-picker-react';
import type { Gif } from 'gif-picker-react';
import { Giphy } from 'gif-picker-react/providers/giphy';
import { Klipy } from 'gif-picker-react/providers/klipy';
import { TenorV1Provider } from './TenorV1Provider';
import 'gif-picker-react/style.css';

const giphyProvider = Giphy(import.meta.env.VITE_GIPHY_API_KEY || 'Gc7131jiJuvI7IdN0HZ1D7nh0ow5BU6g');
const tenorProvider = new TenorV1Provider(import.meta.env.VITE_TENOR_API_KEY || 'LIVDSRZULELA');
const klipyProvider = Klipy('klipy-app-key');

interface GifPickerProps {
  onGifSelect: (url: string) => void;
}

export const GifPicker: React.FC<GifPickerProps> = ({ onGifSelect }) => {
  const [activeTab, setActiveTab] = useState<'tenor' | 'giphy' | 'klipy'>('tenor');

  const getProvider = () => {
    switch (activeTab) {
      case 'giphy': return giphyProvider;
      case 'klipy': return klipyProvider;
      case 'tenor': default: return tenorProvider;
    }
  };

  return (
    <div className="absolute bottom-full right-0 mb-2 z-50 bg-[#121218] rounded-xl border border-white/10 shadow-2xl flex flex-col w-[350px] overflow-hidden" style={{ height: '480px' }}>
      <div className="flex items-center justify-between px-2 pt-2 pb-1 border-b border-white/10 bg-black/20 shrink-0">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('tenor')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'tenor' ? 'bg-white/10 text-accent border-b-2 border-accent' : 'text-white/50 hover:text-white/80'}`}
          >
            Tenor
          </button>
          <button
            onClick={() => setActiveTab('giphy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'giphy' ? 'bg-white/10 text-accent border-b-2 border-accent' : 'text-white/50 hover:text-white/80'}`}
          >
            Giphy
          </button>
          <button
            onClick={() => setActiveTab('klipy')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${activeTab === 'klipy' ? 'bg-white/10 text-accent border-b-2 border-accent' : 'text-white/50 hover:text-white/80'}`}
          >
            Klipy
          </button>
        </div>
      </div>
      <div className="flex-1 w-full bg-[#121218] picker-container">
        <style dangerouslySetInnerHTML={{__html: `
          .picker-container .GifPickerReact {
            --gpr-bg-color: transparent !important;
            --gpr-text-color: rgba(255, 255, 255, 0.9) !important;
            --gpr-highlight-color: rgba(34, 211, 238, 0.2) !important;
            --gpr-search-input-bg-color: rgba(255, 255, 255, 0.1) !important;
            --gpr-search-input-bg-color-active: rgba(255, 255, 255, 0.15) !important;
            --gpr-search-input-text-color: #fff !important;
            --gpr-search-input-placeholder-color: rgba(255, 255, 255, 0.5) !important;
            --gpr-search-border-color-inactive: transparent !important;
            --gpr-search-border-color-active: rgba(34, 211, 238, 0.5) !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 0 !important;
            border: none !important;
          }
        `}} />
        <ReactGifPicker
          theme={Theme.DARK}
          provider={getProvider()}
          onGifClick={(gif: Gif) => {
            onGifSelect(gif.imageUrl || (gif.preview && gif.preview.imageUrl) || '');
          }}
        />
      </div>
    </div>
  );
};
