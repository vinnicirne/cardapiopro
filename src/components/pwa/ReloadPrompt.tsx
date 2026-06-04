/// <reference types="vite-plugin-pwa/client" />
import { useRegisterSW } from 'virtual:pwa-register/react';
import { X, RefreshCw } from 'lucide-react';

export function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm flex flex-col gap-3">
        <div className="text-sm text-gray-700 font-medium">
          {offlineReady ? (
            <span>App pronto para funcionar offline.</span>
          ) : (
            <span>Nova atualização disponível, recarregue para atualizar.</span>
          )}
        </div>
        
        <div className="flex gap-2">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-primary text-white text-sm font-medium rounded-md hover:bg-brand-primary/90 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Recarregar
            </button>
          )}
          <button
            onClick={close}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
