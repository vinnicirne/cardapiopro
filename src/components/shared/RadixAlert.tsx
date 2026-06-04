import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';

interface RadixAlertProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  buttonText?: string;
  type?: 'error' | 'warning' | 'info' | 'success';
}

export function RadixAlert({
  open,
  onOpenChange,
  title,
  description,
  buttonText = 'Entendi',
  type = 'error'
}: RadixAlertProps) {
  
  const getIcon = () => {
    switch (type) {
      case 'error': return <XCircle className="w-6 h-6 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-orange-600" />;
      case 'success': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'info': return <Info className="w-6 h-6 text-blue-600" />;
    }
  };

  const getButtonClass = () => {
    switch (type) {
      case 'error': return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'warning': return 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500';
      case 'success': return 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
      case 'info': return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="bg-black/50 data-[state=open]:animate-overlayShow fixed inset-0 z-50" />
        <AlertDialog.Content className="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[400px] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white p-6 shadow-xl focus:outline-none z-50">
          <div className="flex flex-col items-center text-center gap-4">
            <div className={`p-3 rounded-full ${
              type === 'error' ? 'bg-red-100' : 
              type === 'warning' ? 'bg-orange-100' : 
              type === 'success' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {getIcon()}
            </div>
            
            <div>
              <AlertDialog.Title className="text-xl font-bold text-gray-900 m-0">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="text-gray-500 mt-2 mb-5 text-[15px] leading-normal">
                {description}
              </AlertDialog.Description>
            </div>
          </div>
          
          <div className="flex justify-center w-full">
            <AlertDialog.Action asChild>
              <button 
                className={`w-full text-white font-medium h-[44px] px-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${getButtonClass()}`}
              >
                {buttonText}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
