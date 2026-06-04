import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Clock, ChefHat, Motorbike, CheckCircle, XCircle, AlertCircle, Phone, Printer } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  options: any[];
  product: { name: string } | null;
}

interface Order {
  id: string;
  store_id: string;
  customer_name: string;
  customer_phone: string;
  status: 'pending' | 'preparing' | 'delivering' | 'completed' | 'canceled';
  total: number;
  created_at: string;
  order_items: OrderItem[];
  payment_method?: string;
  change_for?: number;
  delivery_address?: string;
  order_type?: string;
  delivery_fee?: number;
  coupon_code?: string;
  discount_amount?: number;
  customer_id?: string;
}

const STATUS_COLUMNS = [
  { id: 'pending', title: 'Novos', icon: Clock, color: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
  { id: 'preparing', title: 'Preparando', icon: ChefHat, color: 'bg-orange-50 border-orange-200', text: 'text-orange-700' },
  { id: 'delivering', title: 'A Caminho', icon: Motorbike, color: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
  { id: 'completed', title: 'Concluídos', icon: CheckCircle, color: 'bg-green-50 border-green-200', text: 'text-green-700' }
];

// A instância global foi removida para usar a tag <audio> injetada no DOM (Padrão WhatsApp Web)

export default function OrdersPage() {
  const { store } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  const [isSoundEnabled, setIsSoundEnabled] = useState(() => {
    return localStorage.getItem(`audio_enabled_${store?.id}`) === 'true';
  });
  const soundEnabledRef = useRef(isSoundEnabled);

  // Controle absoluto de IDs de pedidos já conhecidos pela tela para evitar sons repetidos
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const isInitialMountRef = useRef(true);

  // Sincroniza a ref se o estado mudar
  useEffect(() => {
    soundEnabledRef.current = isSoundEnabled;
  }, [isSoundEnabled]);

  const playNotificationSound = (isTest = false) => {
    console.log('[AUDIO DEBUG] Entrou na função playNotificationSound()');
    
    try {
      const audioEl = document.getElementById('notification-audio') as HTMLAudioElement | null;
      if (!audioEl) {
        console.error('[AUDIO DEBUG] Tag <audio> não encontrada no DOM!');
        return;
      }

      audioEl.currentTime = 0;
      let playPromise;
      if (isTest) {
        audioEl.loop = false;
        playPromise = audioEl.play();
      } else {
        // Modo Alarme: Toca em loop por 8 segundos para chamar atenção do lojista
        audioEl.loop = true;
        playPromise = audioEl.play();
        
        setTimeout(() => {
          audioEl.loop = false;
        }, 8000);
      }
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log('[AUDIO DEBUG] Áudio tocou com sucesso!');
        }).catch(error => {
          console.error('[AUDIO DEBUG] Bloqueio do navegador ao tocar áudio:', error);
        });
      }
    } catch (e) {
      console.error('[AUDIO DEBUG] Erro fatal no HTML5 Audio:', e);
    }
  };

  const fetchOrders = async () => {
    if (!store) return;
    
    // Fetch orders from today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          id, quantity, price, options,
          product:products (name)
        )
      `)
      .eq('store_id', store.id)
      .gte('created_at', startOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Cast the data, specifically handling the product relationship
      const formattedOrders = data.map(order => ({
        ...order,
        order_items: order.order_items.map((item: any) => ({
          ...item,
          product: Array.isArray(item.product) ? item.product[0] : item.product
        }))
      }));
      setOrders(formattedOrders as Order[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    if (!store) return;

    // Realtime subscription (Canal isolado por loja para evitar conflitos globais)
    const subscription = supabase
      .channel(`orders_${store.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'orders'
      }, (payload) => {
        if (payload.new.store_id !== store.id) return;
        
        console.log('[AUDIO DEBUG] ========= NOVO PEDIDO RECEBIDO (INSERT) =========');
        // O som não é mais disparado aqui! Ele foi desacoplado para um useEffect que vigia a UI.
        // Assim, mesmo se o WebSocket falhar e o Polling salvar, o som toca do mesmo jeito.
        
        // Refetch to get nested order_items
        fetchOrders();
      })
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'orders'
      }, (payload) => {
        if (payload.new.store_id !== store.id) return;
        setOrders(current => current.map(order => {
          if (order.id === payload.new.id) {
            return { ...order, status: payload.new.status };
          }
          return order;
        }));
      })
      .subscribe();

    // Polling de segurança hiper-rápido (Garante atualização em 5 segundos no máximo)
    const pollingInterval = setInterval(() => {
      fetchOrders();
    }, 5000); // 5 segundos

    return () => {
      supabase.removeChannel(subscription);
      clearInterval(pollingInterval);
    };
  }, [store]);

  // Vigilante Absoluto de Estado (Garante o toque independente da rede)
  useEffect(() => {
    // Evita tocar som para os pedidos que já estavam no banco de dados ao carregar a página
    if (isInitialMountRef.current) {
      if (orders.length > 0) {
        orders.forEach(o => knownOrderIdsRef.current.add(o.id));
        isInitialMountRef.current = false;
      }
      if (orders.length === 0 && !loading) {
        isInitialMountRef.current = false;
      }
      return;
    }

    // Checa se apareceu algum pedido "pending" novo que não estava na nossa lista de conhecidos
    const newPendingOrders = orders.filter(
      o => !knownOrderIdsRef.current.has(o.id) && o.status === 'pending'
    );

    if (newPendingOrders.length > 0) {
      console.log('[AUDIO DEBUG] Novo pedido detectado renderizado na UI! IDs:', newPendingOrders.map(o => o.id));
      
      // Adiciona aos conhecidos IMEDIATAMENTE para não tocar duas vezes
      newPendingOrders.forEach(o => knownOrderIdsRef.current.add(o.id));

      if (soundEnabledRef.current) {
        console.log('[AUDIO DEBUG] Disparando som a partir da UI...');
        playNotificationSound();
      }
    }
  }, [orders, loading]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Evitar atualizar o cliente duplicadamente se o pedido já era 'completed'
    const wasCompleted = order.status === 'completed';

    // Optimistic update
    setOrders(current => current.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
    
    await supabase
      .from('orders')
      .update({ 
        status: newStatus,
        store_id: order.store_id,
        customer_phone: order.customer_phone
      })
      .eq('id', orderId);
      
    // Se mudou para completed, atualiza as métricas do cliente
    if (newStatus === 'completed' && !wasCompleted && order.customer_phone) {
      try {
        // Busca o cliente pelo telefone
        const { data: customerData } = await supabase
          .from('customers')
          .select('id, total_orders, total_spent')
          .eq('store_id', store?.id)
          .eq('phone', order.customer_phone)
          .single();
          
        if (customerData) {
          await supabase
            .from('customers')
            .update({
              total_orders: (customerData.total_orders || 0) + 1,
              total_spent: (customerData.total_spent || 0) + order.total,
              last_order_date: new Date().toISOString()
            })
            .eq('id', customerData.id);
        }
      } catch (err) {
        console.error('Erro ao atualizar métricas do cliente:', err);
      }
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = STATUS_COLUMNS.findIndex(c => c.id === currentStatus);
    if (currentIndex >= 0 && currentIndex < STATUS_COLUMNS.length - 1) {
      return STATUS_COLUMNS[currentIndex + 1].id;
    }
    return null;
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Carregando painel de pedidos...</div>;
  }

  return (
    <div className="h-full flex flex-col print:hidden">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Pedidos</h1>
          <p className="text-sm text-gray-500 mt-1">Acompanhe e gerencie os pedidos de hoje em tempo real.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const newState = !isSoundEnabled;
              setIsSoundEnabled(newState);
              soundEnabledRef.current = newState;
              localStorage.setItem(`audio_enabled_${store?.id}`, newState.toString());
              if (newState) {
                playNotificationSound(true); // isTest = true (toca apenas 1 vez)
              }
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors cursor-pointer shadow-sm ${
              isSoundEnabled 
                ? 'bg-green-50 text-green-700 border-2 border-green-500' 
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            {isSoundEnabled ? 'Notificações Sonoras: ON' : 'Notificações Sonoras: OFF'}
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Online e Atualizado
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full min-w-full">
          {STATUS_COLUMNS.map(column => {
            const columnOrders = orders.filter(o => o.status === column.id);
            const Icon = column.icon;
            
            return (
              <div key={column.id} className="flex flex-col bg-gray-50/50 rounded-2xl border border-gray-200 overflow-hidden h-full">
                {/* Column Header */}
                <div className={`p-4 border-b ${column.color} flex items-center justify-between sticky top-0 z-10`}>
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${column.text}`} />
                    <h2 className={`font-bold ${column.text}`}>{column.title}</h2>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full bg-white/60 text-sm font-bold ${column.text}`}>
                    {columnOrders.length}
                  </span>
                </div>

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {columnOrders.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 py-12">
                      <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-sm">Nenhum pedido</p>
                    </div>
                  ) : (
                    columnOrders.map(order => (
                      <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="text-xs font-bold text-gray-400">#{order.id.split('-')[0].toUpperCase()}</span>
                            <h3 className="font-bold text-gray-900 leading-tight">{order.customer_name}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                              {formatTime(order.created_at)}
                            </span>
                            {order.status !== 'canceled' && order.status !== 'completed' && (
                              <button
                                onClick={() => updateOrderStatus(order.id, 'canceled')}
                                className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                                title="Cancelar Pedido"
                              >
                                <XCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {order.customer_phone && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                            <Phone className="w-3 h-3" />
                            {order.customer_phone}
                          </div>
                        )}

                        <div className="space-y-2 mb-4">
                          {order.order_items?.map(item => (
                            <div key={item.id} className="text-sm flex flex-col">
                              <div className="flex justify-between">
                                <span className="text-gray-600 truncate pr-2">
                                  <span className="font-bold text-gray-900">{item.quantity}x</span> {item.product?.name || 'Produto Excluído'}
                                </span>
                                <span className="font-medium text-gray-900 shrink-0">
                                  R$ {(item.quantity * item.price).toFixed(2)}
                                </span>
                              </div>
                              {item.options && item.options.length > 0 && (
                                <div className="text-xs text-gray-500 pl-4 mt-1 border-l-2 border-gray-100 space-y-0.5">
                                  {item.options.map((opt: any, idx: number) => (
                                    <div key={idx}>+ {opt.name}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="flex flex-col pt-3 border-t border-gray-100 mt-2 gap-3">
                          <span className="font-bold text-lg text-primary text-center">Total: R$ {order.total.toFixed(2)}</span>
                          
                          <div className="flex gap-2 w-full">
                            <button
                              onClick={() => setSelectedOrder(order)}
                              className="flex-1 py-1.5 bg-gray-100 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-200 transition-colors"
                            >
                              Comanda
                            </button>
                            
                            {getNextStatus(order.status) && (
                              <button
                                onClick={() => updateOrderStatus(order.id, getNextStatus(order.status)!)}
                                className="flex-1 py-1.5 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                Avançar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comanda Modal - Estilo Nota Fiscal Térmica */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:static print:bg-white print:p-0 print:block">
          <div className="bg-[#FFFFF0] print:bg-white w-full max-w-sm max-h-[90vh] print:max-h-none print:shadow-none overflow-y-auto print:overflow-visible shadow-2xl flex flex-col font-mono text-black relative print:w-full print:max-w-[80mm] print:mx-auto">
            {/* Efeito de serra no topo e em baixo (simulando corte de papel) */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxwb2x5Z29uIHBvaW50cz0iMCwwIDQsOCA4LDAiIGZpbGw9IiM2YjcyODAiLz48L3N2Zz4=')] opacity-20 print:hidden"></div>

            <div className="p-6 pt-8 space-y-4 print:p-0 print:pt-2">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold uppercase tracking-widest border-b-2 border-dashed border-gray-400 pb-2">
                  PEDIDO #{selectedOrder.id.split('-')[0].toUpperCase()}
                </h2>
                <p className="text-xs text-gray-500 mt-2">{formatTime(selectedOrder.created_at)}</p>
                <p className="text-sm font-bold mt-1 bg-gray-100 print:bg-transparent inline-block px-2 py-1 rounded">
                  {selectedOrder.order_type === 'pickup' ? 'RETIRADA NO LOCAL' : 'ENTREGA'}
                </p>
              </div>
              
              {/* Client Info */}
              <div className="border-b-2 border-dashed border-gray-400 pb-4">
                <p className="font-bold uppercase text-sm">CLIENTE:</p>
                <p className="text-sm">{selectedOrder.customer_name}</p>
                <p className="text-sm mt-1">{selectedOrder.customer_phone}</p>
              </div>

              {/* Delivery Info */}
              <div className="border-b-2 border-dashed border-gray-400 pb-4">
                <p className="font-bold uppercase text-sm">ENDEREÇO:</p>
                <p className="text-sm">{selectedOrder.delivery_address || 'RETIRADA NO LOCAL'}</p>
              </div>

              {/* Items */}
              <div className="border-b-2 border-dashed border-gray-400 pb-4">
                <p className="font-bold uppercase text-sm mb-2">ITENS:</p>
                <div className="space-y-3">
                  {selectedOrder.order_items.map(item => (
                    <div key={item.id} className="flex flex-col text-sm items-start">
                      <div className="flex justify-between w-full">
                        <span className="flex-1 pr-2 uppercase font-bold">
                          {item.quantity}x {item.product?.name || 'ITEM EXCLUÍDO'}
                        </span>
                        <span className="font-bold whitespace-nowrap">R$ {(item.quantity * item.price).toFixed(2)}</span>
                      </div>
                      {item.options && item.options.length > 0 && (
                        <div className="w-full text-xs text-gray-600 uppercase pl-4 space-y-1 mt-1">
                          {item.options.map((opt: any, idx: number) => (
                            <div key={idx} className="flex justify-between">
                              <span>+ {opt.name}</span>
                              {opt.price > 0 && <span>R$ {opt.price.toFixed(2)}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment */}
              <div className="pb-4">
                <p className="font-bold uppercase text-sm mb-2">PAGAMENTO:</p>
                <div className="flex justify-between items-center text-sm mb-1">
                  <span className="uppercase">FORMA</span>
                  <span className="font-bold uppercase">
                    {selectedOrder.payment_method === 'money' ? 'DINHEIRO' : 
                     selectedOrder.payment_method === 'card' ? 'CARTÃO' : 
                     selectedOrder.payment_method === 'pix' ? 'PIX' : 'NÃO INFORMADO'}
                  </span>
                </div>
                {selectedOrder.payment_method === 'money' && selectedOrder.change_for && (
                  <div className="flex justify-between items-center text-sm mb-1">
                    <span className="uppercase">TROCO PARA</span>
                    <span className="font-bold uppercase">R$ {selectedOrder.change_for.toFixed(2)}</span>
                  </div>
                )}

                {selectedOrder.delivery_fee && selectedOrder.delivery_fee > 0 ? (
                  <div className="flex justify-between items-center text-sm mt-2 mb-1">
                    <span className="uppercase">TAXA DE ENTREGA</span>
                    <span className="font-bold uppercase">R$ {selectedOrder.delivery_fee.toFixed(2)}</span>
                  </div>
                ) : null}

                {selectedOrder.discount_amount && selectedOrder.discount_amount > 0 ? (
                  <div className="flex justify-between items-center text-sm mb-1 text-gray-700">
                    <span className="uppercase">DESCONTO {selectedOrder.coupon_code ? `(${selectedOrder.coupon_code})` : ''}</span>
                    <span className="font-bold uppercase">- R$ {selectedOrder.discount_amount.toFixed(2)}</span>
                  </div>
                ) : null}
                
                <div className="flex justify-between items-center text-xl font-bold pt-4 mt-2 border-t-2 border-dashed border-gray-800">
                  <span className="uppercase">TOTAL</span>
                  <span>R$ {selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-2 pb-4">
                <p className="text-xs uppercase font-bold text-gray-500">*** OBRIGADO PELA PREFERÊNCIA ***</p>
              </div>
            </div>
            
            {/* Botoes de Acao por cima da nota fiscal */}
            <div className="p-4 bg-gray-900/5 mt-auto flex gap-3 border-t border-gray-200 print:hidden">
              <button onClick={() => setSelectedOrder(null)} className="px-4 py-3 bg-gray-200 text-gray-700 font-bold font-sans rounded-xl cursor-pointer hover:bg-gray-300 transition-colors">
                Fechar
              </button>
              <button 
                onClick={() => window.print()}
                className="px-4 py-3 bg-gray-800 text-white font-bold font-sans rounded-xl flex items-center justify-center hover:bg-gray-900 transition-colors cursor-pointer"
                title="Imprimir Cupom"
              >
                <Printer className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  const msg = encodeURIComponent(`Olá ${selectedOrder.customer_name}! Somos da loja e vimos seu pedido...`);
                  window.open(`https://wa.me/${selectedOrder.customer_phone}?text=${msg}`, '_blank');
                }}
                className="flex-1 py-3 bg-green-500 text-white font-bold font-sans rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4" /> WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Tag de Áudio Embutida no DOM para Burlar o Bloqueio de Autoplay (Padrão WhatsApp) */}
      <audio id="notification-audio" src="/notification.mp3" preload="auto" />
    </div>
  );
}
