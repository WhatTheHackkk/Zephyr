import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../utils/cropImage';
import { X } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  aspectRatio: number; // 1 for square, 16/9 for banner
  onCropComplete: (croppedFile: File) => void;
  onCancel: () => void;
}

const ImageCropperModal: React.FC<ImageCropperModalProps> = ({
  imageSrc,
  aspectRatio,
  onCropComplete,
  onCancel
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (crop: any) => setCrop(crop);
  const onZoomChange = (zoom: number) => setZoom(zoom);
  const onCropCompleteCallback = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels, 0);
      if (croppedFile) {
        onCropComplete(croppedFile);
      } else {
        console.error("Failed to crop image.");
        onCancel();
      }
    } catch (e) {
      console.error(e);
      onCancel();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black/90 backdrop-blur-md">
      <div className="flex justify-between items-center p-4 md:p-6 border-b border-white/10 shrink-0">
        <h3 className="text-white font-bold text-lg">Edit Media</h3>
        <button onClick={onCancel} className="text-white/60 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative w-full overflow-hidden">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={aspectRatio}
          onCropChange={onCropChange}
          onCropComplete={onCropCompleteCallback}
          onZoomChange={onZoomChange}
          cropShape={aspectRatio === 1 ? 'round' : 'rect'}
          showGrid={false}
        />
      </div>

      <div className="p-6 border-t border-white/10 bg-[#111116] shrink-0 flex flex-col gap-4">
        <div className="flex items-center gap-4 max-w-md mx-auto w-full">
          <span className="text-white/60 text-sm font-medium">Zoom</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-cyan-500 bg-white/10 rounded-full appearance-none h-1.5"
          />
        </div>
        
        <div className="flex justify-end gap-3 max-w-md mx-auto w-full">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-6 py-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-colors font-medium"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleApply}
            disabled={isProcessing}
            className="liquid-btn liquid-btn-primary px-8 py-2 rounded-xl font-medium"
          >
            {isProcessing ? 'Processing...' : 'Apply'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropperModal;
