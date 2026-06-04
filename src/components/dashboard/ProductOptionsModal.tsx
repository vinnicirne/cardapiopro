import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export interface OptionGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  options: Option[];
}

export interface Option {
  id: string;
  name: string;
  price: number;
}

interface ProductOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
}

export default function ProductOptionsModal({ isOpen, onClose, productId, productName }: ProductOptionsModalProps) {
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && productId) {
      fetchOptions();
    }
  }, [isOpen, productId]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: true });

      if (groupsError) throw groupsError;

      // Fetch options
      if (groupsData && groupsData.length > 0) {
        const groupIds = groupsData.map(g => g.id);
        const { data: optionsData, error: optionsError } = await supabase
          .from('product_options')
          .select('*')
          .in('group_id', groupIds)
          .order('created_at', { ascending: true });
        
        if (optionsError) throw optionsError;

        const mergedGroups = groupsData.map(group => ({
          ...group,
          options: optionsData?.filter(opt => opt.group_id === group.id) || []
        }));

        setGroups(mergedGroups);
      } else {
        setGroups([]);
      }
    } catch (error) {
      console.error("Erro ao buscar opções", error);
    } finally {
      setLoading(false);
    }
  };

  const addGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('product_option_groups')
        .insert({
          product_id: productId,
          name: 'Novo Grupo',
          is_required: false,
          min_selections: 0,
          max_selections: 1
        })
        .select()
        .single();
      
      if (error) throw error;
      setGroups(prev => [...prev, { ...data, options: [] }]);
    } catch (error) {
      console.error(error);
      alert('Erro ao criar grupo');
    }
  };

  const addOption = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('product_options')
        .insert({
          group_id: groupId,
          name: 'Nova Opção',
          price: 0
        })
        .select()
        .single();
      
      if (error) throw error;

      setGroups(prev => prev.map(g => 
        g.id === groupId ? { ...g, options: [...g.options, data] } : g
      ));
    } catch (error) {
      console.error(error);
      alert('Erro ao criar opção');
    }
  };

  const updateGroup = async (groupId: string, field: keyof OptionGroup, value: any) => {
    // Update local state instantly for responsiveness
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, [field]: value } : g));
    
    // Save to DB
    try {
      await supabase.from('product_option_groups').update({ [field]: value }).eq('id', groupId);
    } catch (error) {
      console.error(error);
    }
  };

  const updateOption = async (groupId: string, optionId: string, field: keyof Option, value: any) => {
    // Update local state
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          options: g.options.map(opt => opt.id === optionId ? { ...opt, [field]: value } : opt)
        };
      }
      return g;
    }));

    // Save to DB
    try {
      await supabase.from('product_options').update({ [field]: value }).eq('id', optionId);
    } catch (error) {
      console.error(error);
    }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Tem certeza? Isso apagará todas as opções deste grupo.')) return;
    try {
      await supabase.from('product_option_groups').delete().eq('id', groupId);
      setGroups(prev => prev.filter(g => g.id !== groupId));
    } catch (error) {
      console.error(error);
      alert('Erro ao deletar grupo');
    }
  };

  const deleteOption = async (groupId: string, optionId: string) => {
    try {
      await supabase.from('product_options').delete().eq('id', optionId);
      setGroups(prev => prev.map(g => {
        if (g.id === groupId) {
          return { ...g, options: g.options.filter(opt => opt.id !== optionId) };
        }
        return g;
      }));
    } catch (error) {
      console.error(error);
      alert('Erro ao deletar opção');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-gray-50 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-xl">
        <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between rounded-t-2xl shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Complementos e Opções</h2>
            <p className="text-sm text-gray-500">Produto: {productName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Carregando complementos...</div>
          ) : (
            <>
              {groups.map((group) => (
                <div key={group.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                  {/* Group Header Settings */}
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                      <div className="flex-1 space-y-3 w-full">
                        <div className="flex gap-2 w-full">
                          <input 
                            type="text" 
                            value={group.name} 
                            onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                            className="flex-1 font-bold text-gray-900 border border-transparent hover:border-gray-300 focus:border-primary focus:ring-1 focus:ring-primary rounded px-2 py-1 outline-none transition-colors"
                            placeholder="Ex: Escolha sua carne"
                          />
                          <button onClick={() => deleteGroup(group.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded cursor-pointer shrink-0">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 bg-white p-3 rounded-lg border border-gray-100">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={group.is_required}
                              onChange={(e) => updateGroup(group.id, 'is_required', e.target.checked)}
                              className="text-primary focus:ring-primary rounded cursor-pointer"
                            />
                            Obrigatório
                          </label>
                          <div className="h-4 w-px bg-gray-300 hidden sm:block"></div>
                          <label className="flex items-center gap-2">
                            Mínimo:
                            <input 
                              type="number" 
                              min="0"
                              value={group.min_selections}
                              onChange={(e) => updateGroup(group.id, 'min_selections', parseInt(e.target.value) || 0)}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                            />
                          </label>
                          <label className="flex items-center gap-2">
                            Máximo:
                            <input 
                              type="number" 
                              min="1"
                              value={group.max_selections}
                              onChange={(e) => updateGroup(group.id, 'max_selections', parseInt(e.target.value) || 1)}
                              className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Options List */}
                  <div className="p-4 space-y-2">
                    {group.options.map((option) => (
                      <div key={option.id} className="flex items-center gap-3 bg-white p-2 border border-gray-100 rounded-lg hover:border-gray-300 transition-colors">
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-grab shrink-0" />
                        <input 
                          type="text" 
                          value={option.name} 
                          onChange={(e) => updateOption(group.id, option.id, 'name', e.target.value)}
                          className="flex-1 border border-transparent hover:border-gray-200 focus:border-primary rounded px-2 py-1 outline-none text-sm"
                          placeholder="Ex: Bacon"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-gray-500 text-sm">R$</span>
                          <input 
                            type="number" 
                            step="0.01"
                            value={option.price} 
                            onChange={(e) => updateOption(group.id, option.id, 'price', parseFloat(e.target.value) || 0)}
                            className="w-24 border border-gray-200 hover:border-gray-300 focus:border-primary rounded px-2 py-1 outline-none text-sm text-right"
                          />
                        </div>
                        <button onClick={() => deleteOption(group.id, option.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded cursor-pointer shrink-0">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button 
                      onClick={() => addOption(group.id)}
                      className="mt-2 text-sm text-primary hover:text-orange-700 font-medium flex items-center gap-1 cursor-pointer px-2"
                    >
                      <Plus className="w-4 h-4" /> Adicionar opção
                    </button>
                  </div>
                </div>
              ))}
              
              <button 
                onClick={addGroup}
                className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-primary hover:border-primary hover:bg-orange-50/50 transition-colors font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" /> Adicionar Novo Grupo de Opções
              </button>
            </>
          )}
        </div>

        <div className="p-4 bg-white border-t border-gray-100 rounded-b-2xl shrink-0 flex justify-end">
          <button onClick={onClose} className="px-6 py-2 bg-primary text-white rounded-lg font-medium cursor-pointer">
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
