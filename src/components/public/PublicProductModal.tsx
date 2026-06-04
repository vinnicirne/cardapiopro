import { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCartStore } from '../../store/cartStore';
import type { Product, SelectedOption } from '../../store/cartStore';

interface PublicProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
}

interface OptionGroup {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  options: Option[];
}

interface Option {
  id: string;
  name: string;
  price: number;
}

export default function PublicProductModal({ isOpen, onClose, product }: PublicProductModalProps) {
  const { addItem } = useCartStore();
  const [groups, setGroups] = useState<OptionGroup[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to hold selected options: Record<groupId, Set<optionId>>
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Set<string>>>({});
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      setQuantity(1);
      setObservations('');
      setSelectedOptions({});
      fetchOptions();
    }
  }, [isOpen, product]);

  const fetchOptions = async () => {
    setLoading(true);
    try {
      const { data: groupsData, error: groupsError } = await supabase
        .from('product_option_groups')
        .select('*')
        .eq('product_id', product.id)
        .order('created_at', { ascending: true });

      if (groupsError) throw groupsError;

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
        
        // Initialize selected options state
        const initialSelected: Record<string, Set<string>> = {};
        mergedGroups.forEach(g => {
          initialSelected[g.id] = new Set();
        });
        setSelectedOptions(initialSelected);
      } else {
        setGroups([]);
        setSelectedOptions({});
      }
    } catch (error) {
      console.error("Erro ao buscar opções", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionToggle = (groupId: string, optionId: string, maxSelections: number) => {
    setSelectedOptions(prev => {
      const groupSelections = new Set(prev[groupId]);
      
      if (groupSelections.has(optionId)) {
        groupSelections.delete(optionId);
      } else {
        // If it's a single choice (radio behavior), replace the selection
        if (maxSelections === 1) {
          groupSelections.clear();
          groupSelections.add(optionId);
        } 
        // If multiple choice, only add if under the limit
        else if (groupSelections.size < maxSelections) {
          groupSelections.add(optionId);
        }
      }

      return { ...prev, [groupId]: groupSelections };
    });
  };

  // Validate if all required groups have minimum selections
  const isValid = groups.every(group => {
    const selectedCount = selectedOptions[group.id]?.size || 0;
    return selectedCount >= group.min_selections;
  });

  const getOptionsTotal = () => {
    let total = 0;
    groups.forEach(group => {
      const selectedForGroup = selectedOptions[group.id] || new Set();
      group.options.forEach(opt => {
        if (selectedForGroup.has(opt.id)) {
          total += Number(opt.price);
        }
      });
    });
    return total;
  };

  const calculateTotal = () => {
    return (Number(product.price) + getOptionsTotal()) * quantity;
  };

  const handleAddToCart = () => {
    if (!isValid) return;

    // Flatten selected options into a single array for the cart
    const finalOptions: SelectedOption[] = [];
    groups.forEach(group => {
      const selectedForGroup = selectedOptions[group.id] || new Set();
      group.options.forEach(opt => {
        if (selectedForGroup.has(opt.id)) {
          finalOptions.push({
            id: opt.id,
            name: `${group.name}: ${opt.name}`,
            price: Number(opt.price)
          });
        }
      });
    });

    addItem(product, quantity, observations, finalOptions);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center bg-black/50 sm:p-4">
      {/* Click away area for mobile */}
      <div className="absolute inset-0 block sm:hidden" onClick={onClose} />
      
      <div className="bg-gray-50 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-xl h-[85vh] sm:h-auto sm:max-h-[90vh] flex flex-col shadow-xl relative z-10 overflow-hidden">
        {/* Header Image (if exists) */}
        {product.imageUrl && (
          <div className="w-full h-48 sm:h-56 shrink-0 relative">
            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
            <button 
              onClick={onClose} 
              className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm cursor-pointer hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 overflow-y-auto pb-24 sm:pb-0">
          <div className="p-5 bg-white">
            {!product.imageUrl && (
              <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer z-10">
                <X className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-2xl font-bold text-gray-900 pr-8">{product.name}</h2>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">{product.description}</p>
            <div className="mt-3 flex items-center gap-2">
              {product.originalPrice && product.originalPrice > product.price && (
                <>
                  <span className="text-sm text-gray-400 line-through">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.originalPrice)}
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded uppercase">
                    -{Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}%
                  </span>
                </>
              )}
              <div className="font-bold text-xl text-gray-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">Carregando opções...</div>
          ) : (
            <div className="p-4 space-y-4">
              {groups.map(group => {
                const selectedCount = selectedOptions[group.id]?.size || 0;
                const isSatisfied = selectedCount >= group.min_selections;
                
                return (
                  <div key={group.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900">{group.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.min_selections === group.max_selections && group.min_selections > 0
                            ? `Escolha ${group.min_selections}`
                            : group.min_selections > 0
                              ? `Escolha de ${group.min_selections} a ${group.max_selections}`
                              : `Escolha até ${group.max_selections} (Opcional)`}
                        </p>
                      </div>
                      {group.is_required && (
                        <span className={`text-xs font-bold px-2 py-1 rounded ${isSatisfied ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                          {isSatisfied ? 'OBRIGATÓRIO' : 'OBRIGATÓRIO'}
                        </span>
                      )}
                    </div>
                    
                    <div className="divide-y divide-gray-50">
                      {group.options.map(option => {
                        const isSelected = selectedOptions[group.id]?.has(option.id);
                        const isDisabled = !isSelected && selectedCount >= group.max_selections && group.max_selections > 1;
                        
                        return (
                          <label 
                            key={option.id} 
                            className={`flex items-center justify-between p-4 transition-colors ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 flex items-center justify-center shrink-0 border ${group.max_selections === 1 ? 'rounded-full' : 'rounded'} ${isSelected ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                {isSelected && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                              </div>
                              <span className={`font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{option.name}</span>
                            </div>
                            {Number(option.price) > 0 && (
                              <span className="text-sm text-gray-600 font-medium">
                                + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(option.price)}
                              </span>
                            )}
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => handleOptionToggle(group.id, option.id, group.max_selections)}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm p-4">
                <label className="block font-bold text-gray-900 mb-2">Alguma observação?</label>
                <textarea 
                  rows={2}
                  value={observations}
                  onChange={e => setObservations(e.target.value)}
                  placeholder="Ex: Tirar cebola, maionese à parte..."
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-4 bg-white border-t border-gray-100 sm:rounded-b-2xl absolute bottom-0 left-0 right-0 sm:relative">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 bg-gray-100 rounded-xl p-2 shrink-0">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer"
              >
                <Minus className="w-5 h-5" />
              </button>
              <span className="font-bold w-4 text-center">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 flex items-center justify-center bg-white rounded-lg text-gray-700 shadow-sm hover:bg-gray-50 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            
            <button 
              onClick={handleAddToCart}
              disabled={!isValid}
              className="flex-1 bg-primary hover:bg-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl py-4 font-medium flex items-center justify-between px-6 transition-colors cursor-pointer"
            >
              <span>Adicionar</span>
              <span className="font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateTotal())}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
