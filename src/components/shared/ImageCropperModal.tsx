import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../../lib/cropImage';
import { X, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string;
  aspectRatio: number; // 1 for square (logo), 3 for cover (3:1 roughly)
  objectFit?: 'contain' | 'horizontal-cover' | 'vertical-cover' | 'cover';
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export default function ImageCropperModal({ 
  isOpen, 
  imageSrc, 
  aspectRatio, 
  objectFit = 'cover',
  onClose, 
  onCropComplete 
}: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropCompleteInternal = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    setIsProcessing(true);
    try {
      const croppedImageFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (croppedImageFile) {
        onCropComplete(croppedImageFile);
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao recortar imagem.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="bg-white rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Ajustar Imagem</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cropper Area */}
        <div className="relative w-full h-[50vh] bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onCropComplete={onCropCompleteInternal}
            onZoomChange={setZoom}
            objectFit={objectFit}
          />
        </div>

        {/* Footer Controls */}
        <div className="p-6 bg-white space-y-6">
          
          <div className="flex items-center gap-4 max-w-md mx-auto">
            <ZoomOut className="w-5 h-5 text-gray-500" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-labelledby="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <ZoomIn className="w-5 h-5 text-gray-500" />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-gray-100">
            <button 
              onClick={onClose}
              disabled={isProcessing}
              className="px-6 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              onClick={handleConfirm}
              disabled={isProcessing}
              className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isProcessing ? 'Cortando...' : 'Confirmar Recorte'}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
