import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { usePlatformStore } from '../../store/platformStore';
import { Upload, X, AlertCircle } from 'lucide-react';

export default function PlatformSettingsPage() {
  const { settings, fetchSettings } = usePlatformStore();
  const [platformName, setPlatformName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('');
  const [landingTitle, setLandingTitle] = useState('');
  const [landingSubtitle, setLandingSubtitle] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (settings) {
      setPlatformName(settings.platform_name || '');
      setPrimaryColor(settings.primary_color || '#ea580c');
      setLandingTitle(settings.landing_title || '');
      setLandingSubtitle(settings.landing_subtitle || '');
      setLogoUrl(settings.logo_url || '');
    }
  }, [settings]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setPreviewUrl('');
    setLogoUrl('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let finalLogoUrl = logoUrl;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('platform-assets')
          .upload(fileName, logoFile);
          
        if (uploadError) {
          console.error("Erro no upload:", uploadError);
          setMessage({ type: 'error', text: `Erro ao subir imagem: ${uploadError.message}. Verifique se o bucket 'platform-assets' existe.` });
          setLoading(false);
          return;
        }

        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage
            .from('platform-assets')
            .getPublicUrl(fileName);
          finalLogoUrl = publicUrl;
        }
      }

      const { error } = await supabase
        .from('platform_settings')
        .update({
          platform_name: platformName,
          primary_color: primaryColor,
          landing_title: landingTitle,
          landing_subtitle: landingSubtitle,
          logo_url: finalLogoUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1);

      if (error) {
        console.error("Erro no update:", error);
        setMessage({ type: 'error', text: `Erro ao salvar no banco: ${error.message}. Você aplicou a migration 005_whitelabel?` });
        setLoading(false);
        return;
      }

      setMessage({ type: 'success', text: 'Configurações salvas com sucesso! As alterações já estão valendo para todos.' });
      await fetchSettings(); // Recarrega no global store
      setTimeout(() => setMessage(null), 4000);
      
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: `Erro inesperado: ${err.message}` });
    }
    
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações de Whitelabel</h1>
        <p className="text-sm text-gray-500 mt-1">Personalize as cores e textos do seu SaaS para todos os clientes.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-6">
          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.type === 'error' && <AlertCircle className="w-5 h-5 shrink-0" />}
              {message.text}
            </div>
          )}

          <div className="border-b border-gray-200 pb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Logomarca da Plataforma</label>
            <div className="flex items-center gap-6">
              <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                {(previewUrl || logoUrl) ? (
                  <>
                    <img src={previewUrl || logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
                    <button type="button" onClick={removeLogo} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white cursor-pointer transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </>
                ) : (
                  <Upload className="w-8 h-8 text-gray-400" />
                )}
              </div>
              <div>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png, image/jpeg, image/svg+xml"
                  className="hidden" 
                  id="logo-upload" 
                />
                <label 
                  htmlFor="logo-upload"
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer inline-block transition-colors"
                >
                  Procurar Imagem
                </label>
                <p className="text-xs text-gray-500 mt-2">Recomendado: PNG ou SVG com fundo transparente. Máx 2MB.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Plataforma</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cor Primária (Hexadecimal)</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded cursor-pointer border border-gray-300"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  required
                  pattern="^#+([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Textos da Landing Page</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título Principal (Headline)</label>
                <input
                  type="text"
                  value={landingTitle}
                  onChange={(e) => setLandingTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subtítulo</label>
                <textarea
                  value={landingSubtitle}
                  onChange={(e) => setLandingSubtitle(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 focus:ring-4 focus:ring-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
