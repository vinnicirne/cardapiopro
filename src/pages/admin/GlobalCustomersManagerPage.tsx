import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ShieldAlert, CheckCircle2, Search, Store } from 'lucide-react';
import { RadixConfirm } from '../../components/shared/RadixConfirm';

interface GlobalCustomer {
  id: string;
  name: string;
  phone: string;
  is_blocked: boolean;
  total_orders: number;
  total_spent: number;
  created_at: string;
  store_id: string;
  stores?: {
    name: string;
    slug: string;
  };
}

export default function GlobalCustomersManagerPage() {
  const [customers, setCustomers] = useState<GlobalCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    
    // Busca os clientes e junta com a tabela stores para sabermos de qual loja eles são
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        stores (
          name,
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCustomers(data as GlobalCustomer[]);
    }
    setLoading(false);
  };

  const toggleBlockStatus = async (customerId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('customers')
      .update({ is_blocked: !currentStatus })
      .eq('id', customerId);

    if (!error) {
      fetchCustomers();
    } else {
      alert('Erro ao alterar o status do cliente.');
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    (c.stores?.name && c.stores.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Consumidores Finais (Global)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão geral de todas as pessoas que pedem comida nas lojas da plataforma.
          </p>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
        <Search className="w-5 h-5 text-gray-400" />
        <input 
          type="text"
          placeholder="Buscar por nome, telefone ou nome da loja..."
          className="flex-1 bg-transparent border-none focus:outline-none text-gray-700"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Loja Vinculada</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Métricas</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Carregando consumidores...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    Nenhum consumidor encontrado.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700">
                        <Store className="w-4 h-4 text-orange-500" />
                        <span className="font-medium">{customer.stores?.name || 'Loja Desconhecida'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-medium">{customer.total_orders} pedidos</div>
                      <div className="text-xs text-green-600 font-bold">R$ {Number(customer.total_spent).toFixed(2).replace('.', ',')}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {customer.is_blocked ? (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">Banido</span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">Ativo</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {customer.is_blocked ? (
                        <RadixConfirm
                          title="Desbloquear Cliente?"
                          description={`Tem certeza que deseja permitir que ${customer.name} volte a fazer pedidos na loja ${customer.stores?.name}?`}
                          onConfirm={() => toggleBlockStatus(customer.id, customer.is_blocked)}
                        >
                          <button className="text-green-600 hover:text-green-800 flex items-center gap-1 cursor-pointer">
                            <CheckCircle2 className="w-4 h-4" /> Restaurar
                          </button>
                        </RadixConfirm>
                      ) : (
                        <RadixConfirm
                          title="Banir Cliente?"
                          description={`Isso impedirá que ${customer.name} faça novos pedidos na loja ${customer.stores?.name}.`}
                          onConfirm={() => toggleBlockStatus(customer.id, customer.is_blocked)}
                        >
                          <button className="text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer">
                            <ShieldAlert className="w-4 h-4" /> Banir
                          </button>
                        </RadixConfirm>
                      )}
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
