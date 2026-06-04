import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import type { Store } from '../../store/authStore';
import { Trash2 } from 'lucide-react';
import { RadixConfirm } from '../../components/shared/RadixConfirm';

// Estendendo o tipo Store para incluir o email
interface AdminStore extends Store {
  owner_email?: string;
  created_at: string;
}

export default function StoresManagerPage() {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStores() {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStores(data);
      }
      setLoading(false);
    }

    fetchStores();
  }, []);

  const handleDeleteStore = async (storeId: string) => {
    try {
      const { error } = await supabase
        .from('stores')
        .delete()
        .eq('id', storeId);

      if (error) throw error;

      setStores(current => current.filter(s => s.id !== storeId));
    } catch (err: any) {
      console.error('Erro ao excluir loja:', err);
      alert('Erro ao excluir loja. Verifique se existem dependências.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Lojas</h1>
          <p className="text-sm text-gray-500 mt-1">Visão geral de todos os lojistas cadastrados no sistema.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Total de Lojas:</span>
          <span className="text-lg font-bold text-primary">{stores.length}</span>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome da Loja</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Slug (Link)</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">E-mail do Dono</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Data de Cadastro</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Carregando lojas...
                  </td>
                </tr>
              ) : stores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhuma loja cadastrada ainda.
                  </td>
                </tr>
              ) : (
                stores.map((store) => (
                  <tr key={store.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{store.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a 
                        href={`/${store.slug}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-primary hover:text-primary hover:underline"
                      >
                        /{store.slug}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {store.owner_email || 'Não informado'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                      {new Date(store.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <RadixConfirm
                        title="Excluir Loja Definitivamente?"
                        description={`Esta ação irá apagar a loja "${store.name}", todos os seus produtos, pedidos e clientes permanentemente. Esta ação não pode ser desfeita.`}
                        onConfirm={() => handleDeleteStore(store.id)}
                      >
                        <button className="text-red-600 hover:text-red-900 cursor-pointer p-2 rounded-full hover:bg-red-50 transition-colors" title="Excluir Loja">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </RadixConfirm>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
