import { QRCodeCanvas } from 'qrcode.react';
import { X, Download, Copy, ExternalLink } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface QrCodeModalProps {
  onClose: () => void;
}

export function QrCodeModal({ onClose }: QrCodeModalProps) {
  const { store } = useAuthStore();
  
  // A URL pública da loja é o domínio atual + /loja/id-da-loja
  const storeUrl = store ? `${window.location.origin}/loja/${store.id}` : '';

  const downloadQR = () => {
    const canvas = document.getElementById('store-qrcode') as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas
        .toDataURL('image/png')
        .replace('image/png', 'image/octet-stream');
      let downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `qrcode-${store?.name || 'loja'}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(storeUrl);
    alert('Link copiado para a área de transferência!');
  };

  if (!store) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Seu Cardápio Digital</h2>
            <p className="text-sm text-gray-500">Imprima o QR Code para as mesas ou divulgue o link</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-2xl border-2 border-gray-100 shadow-sm mb-8">
            <QRCodeCanvas 
              id="store-qrcode"
              value={storeUrl}
              size={240}
              bgColor={"#ffffff"}
              fgColor={"#0f172a"}
              level={"H"}
              includeMargin={false}
            />
          </div>

          <div className="w-full space-y-3">
            <button
              onClick={downloadQR}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-orange-500 transition-colors shadow-sm"
            >
              <Download className="w-5 h-5" />
              Baixar QR Code (PNG)
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={copyLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <Copy className="w-4 h-4" />
                Copiar Link
              </button>
              <a
                href={storeUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl font-medium border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
