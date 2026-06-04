import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Search, MapPin, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';

export interface DeliveryArea {
  id: string;
  name: string;
  fee: number;
  estimated_time?: string;
}

export default function DeliveryAreasPage() {
  const { store } = useAuthStore();
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryArea | null>(null);

  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  useEffect(() => {
    if (store) fetchAreas();
  }, [store]);

  const fetchAreas = async () => {
    if (!store) return;
    const { data, error } = await supabase
      .from('delivery_areas')
      .select('*')
      .eq('store_id', store.id)
      .order('name');
    
    if (data && !error) {
      setAreas(data);
    }
    setLoading(false);
  };

  const openNewModal = () => {
    setEditingArea(null);
    setName('');
    setFee('');
    setEstimatedTime('');
    setIsModalOpen(true);
  };

  const openEditModal = (area: DeliveryArea) => {
    setEditingArea(area);
    setName(area.name);
    setFee(area.fee.toString());
    setEstimatedTime(area.estimated_time || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta área de entrega?')) {
      await supabase.from('delivery_areas').delete().eq('id', id);
      fetchAreas();
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!store) return;
    setIsSaving(true);

    try {
      const areaData = {
        store_id: store.id,
        name,
        fee: parseFloat(fee.replace(',', '.')),
        estimated_time: estimatedTime
      };

      if (editingArea) {
        await supabase.from('delivery_areas').update(areaData).eq('id', editingArea.id);
      } else {
        await supabase.from('delivery_areas').insert(areaData);
      }
      
      await fetchAreas();
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar área. Verifique se o nome já existe.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando áreas...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Áreas de Entrega</h1>
          <p className="text-gray-500">Gerencie as regiões atendidas e taxas de entrega.</p>
        </div>
        <button 
          onClick={openNewModal}
          className="bg-primary hover:bg-primary text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Nova Área
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar áreas de entrega..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-600 text-sm">
              <tr>
                <th className="p-4 font-medium">Bairro / Região</th>
                <th className="p-4 font-medium">Taxa de Entrega</th>
                <th className="p-4 font-medium">Tempo Estimado</th>
                <th className="p-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {areas.map(area => (
                <tr key={area.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    {area.name}
                  </td>
                  <td className="p-4 text-gray-900">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(area.fee)}
                  </td>
                  <td className="p-4 text-gray-600">
                    {area.estimated_time || '-'}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEditModal(area)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(area.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {areas.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">Nenhuma área de entrega cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{editingArea ? 'Editar Área' : 'Nova Área'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome / Região</label>
                <input required autoFocus type="text" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: Centro" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Taxa de Entrega (R$)</label>
                <input required type="text" value={fee} onChange={e => setFee(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tempo Estimado</label>
                <input type="text" value={estimatedTime} onChange={e => setEstimatedTime(e.target.value)} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary outline-none" placeholder="Ex: 30-45 min" />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium cursor-pointer">
                  Cancelar
                </button>
                <button type="submit" disabled={isSaving} className="bg-primary hover:bg-primary text-white px-6 py-2 rounded-lg font-medium cursor-pointer disabled:opacity-50">
                  {isSaving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
