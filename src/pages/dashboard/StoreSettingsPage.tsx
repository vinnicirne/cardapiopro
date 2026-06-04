import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import ImageCropperModal from '../../components/shared/ImageCropperModal';

export default function StoreSettingsPage() {
  const { store, setStore } = useAuthStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [isOpen, setIsOpen] = useState(true);
  const [openingHours, setOpeningHours] = useState<Record<string, { isOpen: boolean; open: string; close: string }>>({
    "0": { isOpen: false, open: "18:00", close: "23:00" },
    "1": { isOpen: true,  open: "18:00", close: "23:00" },
    "2": { isOpen: true,  open: "18:00", close: "23:00" },
    "3": { isOpen: true,  open: "18:00", close: "23:00" },
    "4": { isOpen: true,  open: "18:00", close: "23:00" },
    "5": { isOpen: true,  open: "18:00", close: "23:59" },
    "6": { isOpen: true,  open: "18:00", close: "23:59" }
  });
  const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  const [logoUrl, setLogoUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  
  const [logoPreview, setLogoPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');

  // Crop States
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState('');
  const [cropType, setCropType] = useState<'logo' | 'cover'>('logo');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (store) {
      setName(store.name);
      setSlug(store.slug);
      setPhone(store.phone || '');
      setDeliveryFee(store.delivery_fee ? store.delivery_fee.toString() : '0');
      setLogoUrl(store.logo_url || '');
      setCoverUrl(store.cover_url || '');
      
      if (store.is_open !== undefined) setIsOpen(store.is_open);
      if (store.opening_hours) setOpeningHours(store.opening_hours);
    }
  }, [store]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setCropImageSrc(reader.result?.toString() || '');
        setCropType(type);
        setCropModalOpen(true);
      });
      reader.readAsDataURL(file);
      
      // Reset input value so the same file can be selected again
      e.target.value = '';
    }
  };

  const handleCropComplete = async (croppedFile: File) => {
    setCropModalOpen(false);
    
    try {
      const options = {
        maxSizeMB: cropType === 'logo' ? 0.3 : 0.8,
        maxWidthOrHeight: cropType === 'logo' ? 512 : 1920,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(croppedFile, options);
      
      if (cropType === 'logo') {
        setLogoFile(compressedFile);
        setLogoPreview(URL.createObjectURL(compressedFile));
      } else {
        setCoverFile(compressedFile);
        setCoverPreview(URL.createObjectURL(compressedFile));
      }
    } catch (error) {
      console.error("Erro na compressão pós-crop:", error);
      alert("Erro ao processar imagem.");
    }
  };

  const removeImage = (type: 'logo' | 'cover') => {
    if (type === 'logo') {
      setLogoFile(null);
      setLogoPreview('');
      setLogoUrl('');
    } else {
      setCoverFile(null);
      setCoverPreview('');
      setCoverUrl('');
    }
  };

  const uploadAsset = async (file: File, type: 'logo' | 'cover') => {
    if (!store) return null;
    const fileExt = file.name.split('.').pop() || 'jpeg';
    const fileName = `${store.id}/${type}-${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('store-assets')
      .upload(fileName, file);
      
    if (error) {
      console.error(`Erro upload ${type}:`, error);
      throw error;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('store-assets')
      .getPublicUrl(fileName);
      
    return publicUrl;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;

    setLoading(true);
    setMessage(null);

    try {
      const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');

      let finalLogoUrl = logoUrl;
      let finalCoverUrl = coverUrl;

      // Upload files if they exist
      if (logoFile) {
        finalLogoUrl = await uploadAsset(logoFile, 'logo') || logoUrl;
      }
      
      if (coverFile) {
        finalCoverUrl = await uploadAsset(coverFile, 'cover') || coverUrl;
      }

      const { data, error } = await supabase
        .from('stores')
        .update({ 
          name, 
          slug: formattedSlug,
          phone,
          delivery_fee: parseFloat(deliveryFee.replace(',', '.')) || 0,
          logo_url: finalLogoUrl,
          cover_url: finalCoverUrl,
          is_open: isOpen,
          opening_hours: openingHours
        })
        .eq('id', store.id)
        .select()
        .single();

      if (error) {
        setMessage({ type: 'error', text: `Erro: ${error.message}` });
      } else if (data) {
        setStore(data);
        setSlug(data.slug);
        setMessage({ type: 'success', text: 'Configurações atualizadas com sucesso!' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: `Erro inesperado: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configurações da Loja</h1>
        <p className="text-sm text-gray-500 mt-1">Altere as informações básicas e a identidade visual do seu negócio.</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <form onSubmit={handleSave} className="p-6 space-y-8">
          {message && (
            <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          {/* Identidade Visual */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">Identidade Visual</h3>
            
            <div className="space-y-6">
              {/* Cover Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Capa da Loja</label>
                <div className="h-48 w-full rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group">
                  {(coverPreview || coverUrl) ? (
                    <>
                      <img src={coverPreview || coverUrl} alt="Capa" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage('cover')} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white cursor-pointer transition-colors">
                        <X className="w-8 h-8" />
                      </button>
                    </>
                  ) : (
                    <div className="text-center">
                      <ImageIcon className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-500">Nenhuma capa definida</span>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex justify-between items-center">
                  <p className="text-xs text-gray-500">Recomendado: 1200x400px (JPG/PNG). Será compactada automaticamente.</p>
                  <div>
                    <input type="file" ref={coverInputRef} onChange={(e) => handleFileChange(e, 'cover')} accept="image/*" className="hidden" id="cover-upload" />
                    <label htmlFor="cover-upload" className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 cursor-pointer">
                      Alterar Capa
                    </label>
                  </div>
                </div>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logomarca</label>
                <div className="flex items-center gap-6">
                  <div className="h-24 w-24 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50 overflow-hidden relative group shadow-sm">
                    {(logoPreview || logoUrl) ? (
                      <>
                        <img src={logoPreview || logoUrl} alt="Logo" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage('logo')} className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-white cursor-pointer transition-colors">
                          <X className="w-6 h-6" />
                        </button>
                      </>
                    ) : (
                      <Upload className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input type="file" ref={logoInputRef} onChange={(e) => handleFileChange(e, 'logo')} accept="image/*" className="hidden" id="logo-upload" />
                    <label htmlFor="logo-upload" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer inline-block">
                      Alterar Logo
                    </label>
                    <p className="text-xs text-gray-500 mt-2">Recomendado: Formato quadrado (1:1).</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dados Básicos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">Dados Básicos</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: Pizzaria do Mario"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp de Atendimento</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: 5511999999999 (Apenas números)"
                />
                <p className="text-xs text-gray-500 mt-1">Este número receberá as mensagens do pedido no final do carrinho.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link da Loja (Slug)</label>
                <p className="text-xs text-gray-500 mb-2">Este será o link que você enviará para os seus clientes.</p>
                <div className="flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    seusite.com/
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm"
                    placeholder="pizzaria-do-mario"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Entrega Padrão (R$)</label>
                <input
                  type="text"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Ex: 5.00"
                />
                <p className="text-xs text-gray-500 mt-1">Este valor será somado ao total quando o cliente escolher "Entrega". Deixe 0 para frete grátis.</p>
              </div>
            </div>
          </div>

          {/* Horário de Funcionamento */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 border-b border-gray-100 pb-2">Horário de Funcionamento</h3>
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h4 className="font-bold text-gray-900">Status Manual da Loja</h4>
                  <p className="text-sm text-gray-600">Use este controle para fechar a loja em caso de emergência, independente do horário programado.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {isOpen ? 'LOJA ABERTA' : 'LOJA FECHADA'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors cursor-pointer ${isOpen ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isOpen ? 'translate-x-8' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-bold text-gray-900">Horários Programados</h4>
                  <p className="text-xs text-gray-500">A loja abrirá e fechará automaticamente de acordo com esta tabela (se o Status Manual estiver como Aberta).</p>
                </div>
                <div className="divide-y divide-gray-100">
                  {DAYS_OF_WEEK.map((day, index) => {
                    const dayKey = index.toString();
                    const dayData = openingHours[dayKey];
                    return (
                      <div key={dayKey} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3 w-40 shrink-0">
                          <input
                            type="checkbox"
                            checked={dayData.isOpen}
                            onChange={(e) => setOpeningHours({
                              ...openingHours,
                              [dayKey]: { ...dayData, isOpen: e.target.checked }
                            })}
                            className="w-4 h-4 text-primary rounded border-gray-300 cursor-pointer"
                          />
                          <span className={`font-medium ${dayData.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>{day}</span>
                        </div>
                        
                        {dayData.isOpen ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="time"
                              value={dayData.open}
                              onChange={(e) => setOpeningHours({
                                ...openingHours,
                                [dayKey]: { ...dayData, open: e.target.value }
                              })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm w-24 text-center"
                            />
                            <span className="text-gray-500 text-sm">até</span>
                            <input
                              type="time"
                              value={dayData.close}
                              onChange={(e) => setOpeningHours({
                                ...openingHours,
                                [dayKey]: { ...dayData, close: e.target.value }
                              })}
                              className="px-2 py-1 border border-gray-300 rounded text-sm w-24 text-center"
                            />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400 italic">Fechado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-orange-700 focus:ring-4 focus:ring-orange-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      <ImageCropperModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        aspectRatio={cropType === 'logo' ? 1 : 3} // 1:1 for logo, 3:1 for cover
        onClose={() => setCropModalOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
}
