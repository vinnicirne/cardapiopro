import { Lock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

interface PremiumFeatureOverlayProps {
  title: string;
  description: string;
}

export default function PremiumFeatureOverlay({ title, description }: PremiumFeatureOverlayProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[6px] rounded-xl border border-gray-100 shadow-inner">
      <div className="bg-white p-8 rounded-2xl shadow-2xl border border-primary/20 max-w-md w-full text-center relative overflow-hidden">
        
        {/* Fundo Decorativo */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 via-primary to-orange-600"></div>
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl"></div>
        
        <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-primary/20 text-primary rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm ring-4 ring-white">
          <Lock className="w-8 h-8" />
        </div>
        
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Recurso Premium</h3>
        <h4 className="text-lg font-medium text-primary mb-3">{title}</h4>
        
        <p className="text-gray-600 mb-8 text-sm leading-relaxed">
          {description}
        </p>
        
        <Link 
          to="/dashboard/subscription"
          className="w-full py-3.5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.02] transition-all"
        >
          <Zap className="w-5 h-5 fill-white/20" />
          Fazer Upgrade Agora
        </Link>
      </div>
    </div>
  );
}
