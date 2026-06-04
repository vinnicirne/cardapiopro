import { useState, useEffect } from 'react';
import { X, Clock, ChefHat, Motorbike, CheckCircle, Package } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface CustomerOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  phone: string;
  storeId: string;
}

interface Order {
  id: string;
  created_at: string;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'canceled';
  total: number;
  order_type: string;
  delivery_address: string;
  payment_method: string;
  change_for: number;
  delivery_fee: number;
  discount_amount: number;
  order_items: {
    quantity: number;
    price: number;
    options: any[];
    observations: string;
    product: any;
  }[];
}

const STATUS_MAP = {
  pending: { title: 'Novo', icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
  preparing: { title: 'Preparando', icon: ChefHat, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
  delivering: { title: 'A Caminho', icon: Motorbike, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  completed: { title: 'Concluído', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
  canceled: { title: 'Cancelado', icon: X, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' }
};

export default function CustomerOrdersModal({ isOpen, onClose, phone, storeId }: CustomerOrdersModalProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && phone && storeId) {
      fetchOrders();

      const subscription = supabase
        .channel('public:customer_orders')
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders'
        }, (payload) => {
          // Atualiza se o ID do pedido recebido existir na nossa lista local
          setOrders(current => current.map(order => {
            if (order.id === payload.new.id) {
              return { ...order, status: payload.new.status };
            }
            return order;
          }));
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [isOpen, phone, storeId]);

  const fetchOrders = async () => {
    setLoading(true);
    // Busca os pedidos de hoje desse cliente nessa loja
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, created_at, status, total, order_type, delivery_address, payment_method, change_for, delivery_fee, discount_amount,
        order_items (
          quantity, price, options, observations,
          product:products (name)
        )
      `)
      .eq('store_id', storeId)
      .eq('customer_phone', phone)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      setOrders(data as unknown as Order[]);
    }
    setLoading(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">Meus Pedidos (Hoje)</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Buscando seus pedidos...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Você ainda não fez nenhum pedido hoje nesta loja.</p>
            </div>
          ) : (
            orders.map(order => {
              const statusConfig = STATUS_MAP[order.status] || STATUS_MAP.pending;
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedOrderId === order.id;
              
              return (
                <div 
                  key={order.id} 
                  onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  className={`border rounded-xl p-4 transition-colors cursor-pointer hover:border-primary/50 ${statusConfig.border} ${order.status === 'completed' || order.status === 'canceled' ? 'opacity-70' : 'shadow-sm'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="text-xs text-gray-500">Pedido feito às {formatTime(order.created_at)}</span>
                      <div className="font-bold text-gray-900 mt-1">R$ {order.total.toFixed(2)}</div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${statusConfig.bg} ${statusConfig.color}`}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {statusConfig.title}
                    </div>
                  </div>
                  
                  <div className="space-y-1 mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-medium text-gray-500 mb-2">Resumo dos itens:</p>
                    {order.order_items.map((item, idx) => {
                      const productName = Array.isArray(item.product) ? item.product[0]?.name : item.product?.name;
                      return (
                        <div key={idx} className="text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-900 font-medium">{item.quantity}x {productName || 'Produto'}</span>
                            <span className="text-gray-500">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                          
                          {isExpanded && item.options && item.options.length > 0 && (
                            <div className="pl-4 mt-1 space-y-0.5">
                              {item.options.map((opt: any, i: number) => (
                                <div key={i} className="text-xs text-gray-500 flex justify-between">
                                  <span>+ {opt.name}</span>
                                  <span>R$ {opt.price.toFixed(2)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {isExpanded && item.observations && (
                            <div className="pl-4 mt-1 text-xs text-orange-600 italic">
                              Obs: {item.observations}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 text-sm">
                      <p className="text-xs font-medium text-gray-500 mb-2">Detalhes do Pedido:</p>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo:</span>
                        <span className="font-medium text-gray-900">{order.order_type === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                      </div>
                      
                      {order.order_type === 'delivery' && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Taxa de Entrega:</span>
                            <span className="font-medium text-gray-900">R$ {order.delivery_fee.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col gap-1 mt-1 bg-gray-50 p-2 rounded">
                            <span className="text-gray-500 text-xs">Endereço de Entrega:</span>
                            <span className="font-medium text-gray-900 text-xs">{order.delivery_address}</span>
                          </div>
                        </>
                      )}

                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Desconto aplicado:</span>
                          <span className="font-bold">- R$ {order.discount_amount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-50">
                        <span className="text-gray-500">Pagamento:</span>
                        <span className="font-medium text-gray-900 uppercase">
                          {order.payment_method === 'money' ? 'Dinheiro' : order.payment_method === 'pix' ? 'PIX' : 'Cartão'}
                          {order.payment_method === 'money' && order.change_for ? ` (Troco para R$ ${order.change_for.toFixed(2)})` : ''}
                        </span>
                      </div>
                    </div>
                  )}

                  {!isExpanded && (
                    <div className="mt-2 text-center text-xs text-primary font-medium opacity-60">
                      Clique para ver detalhes
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl shrink-0">
          <p className="text-xs text-center text-gray-500">
            Acompanhe o status do seu pedido em tempo real nesta tela.
          </p>
        </div>
      </div>
    </div>
  );
}
