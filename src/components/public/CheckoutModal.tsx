import { useState, useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { X, MapPin, CreditCard, Banknote, QrCode } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useParams } from 'react-router-dom';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  storePhone: string;
}

export default function CheckoutModal({ isOpen, onClose, storePhone }: CheckoutModalProps) {
  const { items, getTotal, clearCart, removeItem, updateQuantity } = useCartStore();
  const { storeSlug } = useParams<{ storeSlug: string }>();
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'money' | 'card' | 'pix'>('pix');
  const [changeFor, setChangeFor] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Pre-order state
  const [desiredDate, setDesiredDate] = useState('');
  const hasPreorderItems = items.some(item => item.product.is_preorder);

  // Delivery Areas
  const [deliveryAreas, setDeliveryAreas] = useState<any[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>('');

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponError, setCouponError] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  // Carregar dados salvos no localStorage e buscar config da loja
  useEffect(() => {
    if (isOpen) {
      const fetchStoreConfig = async () => {
        const { data } = await supabase.from('stores').select('id, delivery_fee').eq('slug', storeSlug).single();
        if (data) {
          if (data.delivery_fee) {
            setDeliveryFee(data.delivery_fee);
          }
          
          const { data: areasData } = await supabase
            .from('delivery_areas')
            .select('*')
            .eq('store_id', data.id)
            .order('name');
            
          if (areasData && areasData.length > 0) {
            setDeliveryAreas(areasData);
          }

          // Verificar limite de pedidos se a loja estiver no plano grátis
          const { data: storeWithPlan } = await supabase.from('stores').select('*, subscriptions(plans(*))').eq('id', data.id).single();
          const plan = storeWithPlan ? (Array.isArray(storeWithPlan.subscriptions) ? storeWithPlan.subscriptions[0]?.plans : storeWithPlan.subscriptions?.plans) : null;
          
          if (plan && plan.price <= 0) {
            // Contar pedidos deste mes
            const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
            const { count } = await supabase
              .from('orders')
              .select('*', { count: 'exact', head: true })
              .eq('store_id', data.id)
              .gte('created_at', startOfMonth);
            
            if (count !== null && count >= 15) {
              setLimitReached(true);
            }
          }
        }
      };
      fetchStoreConfig();

      const savedPhone = localStorage.getItem('saas_cardapio_phone');
      if (savedPhone) {
        setPhone(savedPhone);
        checkCustomerData(savedPhone);
      }
    }
  }, [isOpen, storeSlug]);

  const checkCustomerData = async (phoneNumber: string) => {
    if (phoneNumber.length < 10) return;
    setLoadingCustomer(true);
    try {
      // 1. Pegar o store_id baseado no storeSlug
      const { data: storeData } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', storeSlug)
        .single();
        
      if (!storeData) return;

      // 2. Buscar o cliente
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('store_id', storeData.id)
        .eq('phone', phoneNumber)
        .single();

      if (customer) {
        setName(customer.name);
        setAddress(customer.address || '');
        setIsBlocked(customer.is_blocked);
      } else {
        setIsBlocked(false);
      }
    } catch (error) {
      console.error("Erro ao buscar cliente", error);
    } finally {
      setLoadingCustomer(false);
    }
  };

  const handlePhoneBlur = () => {
    checkCustomerData(phone);
  };

  if (!isOpen) return null;

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setApplyingCoupon(true);
    setCouponError('');
    
    try {
      const { data: storeData } = await supabase.from('stores').select('id').eq('slug', storeSlug).single();
      if (!storeData) throw new Error('Loja não encontrada');

      const { data: coupon, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', storeData.id)
        .eq('code', couponCode.toUpperCase())
        .eq('active', true)
        .single();
        
      if (error || !coupon) {
        setCouponError('Cupom inválido ou expirado.');
        setAppliedCoupon(null);
        return;
      }

      const baseTotal = getTotal();
      if (coupon.min_order_value > 0 && baseTotal < coupon.min_order_value) {
        setCouponError(`O pedido mínimo para este cupom é R$ ${coupon.min_order_value.toFixed(2)}.`);
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon(coupon);
      setCouponError('');
    } catch (err) {
      setCouponError('Erro ao validar cupom.');
      setAppliedCoupon(null);
    } finally {
      setApplyingCoupon(false);
    }
  };

  const getDiscountAmount = (baseTotal: number) => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === 'percentage') {
      return baseTotal * (appliedCoupon.discount_value / 100);
    }
    return appliedCoupon.discount_value;
  };

  const handleCheckout = async () => {
    setSubmitting(true);
    try {
      // 1. Obter a loja
      const { data: storeData } = await supabase
        .from('stores')
        .select('id')
        .eq('slug', storeSlug)
        .single();

      const storeId = storeData?.id;

      // Se existir o banco (no mock ele não existe, então a gente não quebra se falhar o banco)
      if (storeId) {
        // Upsert do cliente
        const { data: customer, error: customerError } = await supabase
          .from('customers')
          .upsert(
            {
              store_id: storeId,
              phone: phone,
              name: name,
              address: address,
            },
            { onConflict: 'store_id, phone' }
          )
          .select('id')
          .single();

        if (customerError) {
          console.error("Erro Customer:", customerError);
          throw new Error("Erro ao salvar cliente: " + customerError.message);
        }

        if (customer && customer.id) {
          const baseTotal = getTotal();
          const discountAmount = getDiscountAmount(baseTotal);
          const subtotalWithDiscount = Math.max(0, baseTotal - discountAmount);
          const finalTotal = orderType === 'delivery' ? subtotalWithDiscount + deliveryFee : subtotalWithDiscount;
          const orderId = crypto.randomUUID();
          
          const { error: orderError } = await supabase.from('orders').insert({
            id: orderId,
            store_id: storeId,
            customer_name: name,
            customer_phone: phone,
            customer_id: customer.id,
            total: finalTotal,
            status: 'pending',
            order_type: orderType,
            delivery_fee: orderType === 'delivery' ? deliveryFee : 0,
            coupon_code: appliedCoupon ? appliedCoupon.code : null,
            discount_amount: discountAmount,
            payment_method: paymentMethod,
            change_for: paymentMethod === 'money' && changeFor ? parseFloat(changeFor) : null,
            delivery_address: orderType === 'delivery' 
              ? (selectedAreaId 
                  ? `${address} - Bairro: ${deliveryAreas.find(a => a.id === selectedAreaId)?.name}` 
                  : address) 
              : null
          });

          if (orderError) {
            console.error("Erro Order:", orderError);
            throw new Error("Erro ao salvar pedido: " + orderError.message);
          }

          const orderItems = items.map(item => ({
            store_id: storeId,
            order_id: orderId,
            product_id: item.product.id,
            quantity: item.quantity,
            price: item.product.price,
            observations: item.observations || null,
            options: item.selectedOptions || []
          }));
          const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
          
          if (itemsError) {
            console.error("Erro Order Items:", itemsError);
            throw new Error("Erro ao salvar itens: " + itemsError.message);
          }
        }
      }

      // Salvar no localstorage para a próxima vez
      localStorage.setItem('saas_cardapio_phone', phone);
      
      const baseTotal = getTotal();
      const discountAmount = getDiscountAmount(baseTotal);
      const subtotalWithDiscount = Math.max(0, baseTotal - discountAmount);
      const finalTotal = orderType === 'delivery' ? subtotalWithDiscount + deliveryFee : subtotalWithDiscount;
      
      // Format cart items
      const itemsText = items.map(item => {
        let text = `${item.quantity}x ${item.product.name} (R$ ${item.product.price.toFixed(2)})`;
        if (item.selectedOptions && item.selectedOptions.length > 0) {
          text += '\n  ' + item.selectedOptions.map(opt => `+ ${opt.name} (R$ ${opt.price.toFixed(2)})`).join('\n  ');
        }
        if (item.observations) {
          text += `\n  *Obs:* ${item.observations}`;
        }
        return text;
      }).join('\n\n');

      let paymentText = '';
      if (paymentMethod === 'money') {
        paymentText = `Dinheiro (Troco para R$ ${changeFor || finalTotal.toFixed(2)})`;
      } else if (paymentMethod === 'card') {
        paymentText = 'Máquina de Cartão (Débito/Crédito)';
      } else {
        paymentText = 'PIX';
      }

      let orderTypeText = orderType === 'delivery' ? '🛵 *ENTREGA*' : '🛍️ *RETIRADA NO LOCAL*';
      let addressText = orderType === 'delivery' ? `\n*Endereço:* ${address}` : '';
      let feeText = orderType === 'delivery' ? `\n*Subtotal:* R$ ${baseTotal.toFixed(2)}\n*Taxa de Entrega:* R$ ${deliveryFee.toFixed(2)}` : '';
      let discountText = discountAmount > 0 ? `\n*Desconto (${appliedCoupon.code}):* - R$ ${discountAmount.toFixed(2)}` : '';
      let preorderText = hasPreorderItems && desiredDate ? `\n\n📦 *ENCOMENDA PARA:* ${desiredDate}` : '';

      const message = `*NOVO PEDIDO!*\n${orderTypeText}${preorderText}\n\n*Cliente:* ${name}\n*Telefone:* ${phone}${addressText}\n\n*Itens:*\n${itemsText}${feeText}${discountText}\n\n*Total:* R$ ${finalTotal.toFixed(2)}\n*Pagamento:* ${paymentText}`;

      // Limpar formatação do telefone da loja (remover parênteses, traços, espaços)
      const cleanStorePhone = storePhone.replace(/\D/g, '');

      // Create WhatsApp link
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${cleanStorePhone}?text=${encodedMessage}`;
      
      window.open(whatsappUrl, '_blank');
      
      alert('Pedido enviado para o WhatsApp! Você pode acompanhar o status em tempo real clicando no botão "Meus Pedidos" no topo da página.');
      
      clearCart();
      onClose();
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      console.error(err);
      alert(`Houve um erro ao processar o pedido: ${err.message || 'Tente novamente.'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Finalizar Pedido</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isBlocked && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg font-medium text-sm">
              Sua conta foi restrita. Não é possível realizar pedidos online no momento. Entre em contato com o estabelecimento.
            </div>
          )}

          {/* Items Summary */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-3">Seu Pedido</h3>
            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="flex flex-col gap-2 py-3 border-b border-gray-50 last:border-0">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">{item.product.name}</span>
                    <span className="font-bold text-gray-900">
                      R$ {((item.product.price + (item.selectedOptions?.reduce((sum, opt) => sum + opt.price, 0) || 0)) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                  
                  {/* Options List */}
                  {item.selectedOptions && item.selectedOptions.length > 0 && (
                    <div className="text-xs text-gray-500 pl-2 border-l-2 border-gray-200 space-y-1">
                      {item.selectedOptions.map(opt => (
                        <div key={opt.id} className="flex justify-between">
                          <span>+ {opt.name}</span>
                          {opt.price > 0 && <span>R$ {opt.price.toFixed(2)}</span>}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Observations */}
                  {item.observations && (
                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded italic">
                      Obs: {item.observations}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">R$ {(item.product.price + (item.selectedOptions?.reduce((sum, opt) => sum + opt.price, 0) || 0)).toFixed(2)} un.</span>
                    <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-1">
                      <button 
                        onClick={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-md text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        -
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-white rounded-md text-gray-700 shadow-sm hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t border-gray-200">
                <div className="flex justify-between text-gray-600 mb-1">
                  <span>Subtotal</span>
                  <span>R$ {getTotal().toFixed(2)}</span>
                </div>
                {appliedCoupon && (
                  <div className="flex justify-between text-green-600 mb-1 font-medium">
                    <span>Desconto ({appliedCoupon.code})</span>
                    <span>- R$ {getDiscountAmount(getTotal()).toFixed(2)}</span>
                  </div>
                )}
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-gray-600 mb-2">
                    <span>Taxa de Entrega</span>
                    <span>R$ {deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg text-gray-900 mt-2">
                  <span>Total Final</span>
                  <span>R$ {(orderType === 'delivery' ? Math.max(0, getTotal() - getDiscountAmount(getTotal())) + deliveryFee : Math.max(0, getTotal() - getDiscountAmount(getTotal()))).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coupon Input */}
          <div className="pt-4 border-t border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">Cupom de Desconto</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                value={couponCode} 
                onChange={e => setCouponCode(e.target.value.toUpperCase())} 
                disabled={isBlocked || appliedCoupon !== null}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 outline-none font-mono uppercase text-sm disabled:bg-gray-100" 
                placeholder="Ex: PROMO10" 
              />
              {appliedCoupon ? (
                <button onClick={() => { setAppliedCoupon(null); setCouponCode(''); }} className="px-4 py-2 bg-red-100 text-red-600 font-bold rounded-lg text-sm cursor-pointer hover:bg-red-200">
                  Remover
                </button>
              ) : (
                <button onClick={handleApplyCoupon} disabled={!couponCode || applyingCoupon || isBlocked} className="px-4 py-2 bg-gray-900 text-white font-bold rounded-lg text-sm disabled:opacity-50 cursor-pointer transition-colors hover:bg-gray-800">
                  {applyingCoupon ? '...' : 'Aplicar'}
                </button>
              )}
            </div>
            {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}
            {appliedCoupon && <p className="text-xs text-green-600 mt-1 font-medium">Cupom aplicado com sucesso!</p>}
          </div>

          {/* User Info */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu Telefone (WhatsApp)</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={e => setPhone(e.target.value)} 
                onBlur={handlePhoneBlur}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none" 
                placeholder="Ex: 11999999999" 
              />
              {loadingCustomer && <p className="text-xs text-gray-500 mt-1">Buscando dados...</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Seu Nome</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} disabled={isBlocked} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100" placeholder="Como quer ser chamado?" />
            </div>

            {hasPreorderItems && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <label className="block text-sm font-bold text-orange-900 mb-2">
                  📦 Data e Horário Desejados
                </label>
                <p className="text-xs text-orange-700 mb-3">
                  Você possui itens sob encomenda no carrinho. Por favor, informe quando deseja receber/retirar.
                </p>
                <input 
                  type="text" 
                  value={desiredDate} 
                  onChange={e => setDesiredDate(e.target.value)} 
                  disabled={isBlocked} 
                  className="w-full border border-orange-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none disabled:bg-gray-100" 
                  placeholder="Ex: Sexta-feira dia 20, às 14h00" 
                />
              </div>
            )}
            
            {/* Delivery Option */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
              <button 
                onClick={() => setOrderType('delivery')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${orderType === 'delivery' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Entrega
              </button>
              <button 
                onClick={() => setOrderType('pickup')}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors cursor-pointer ${orderType === 'pickup' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Retirar na Loja
              </button>
            </div>

            {orderType === 'delivery' && (
              <div className="space-y-3">
                {deliveryAreas.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Bairro / Região
                    </label>
                    <select 
                      value={selectedAreaId} 
                      onChange={e => {
                        setSelectedAreaId(e.target.value);
                        const area = deliveryAreas.find(a => a.id === e.target.value);
                        if (area) {
                          setDeliveryFee(area.fee);
                        }
                      }} 
                      disabled={isBlocked} 
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100 bg-white"
                      required
                    >
                      <option value="" disabled>Selecione seu bairro...</option>
                      {deliveryAreas.map(area => (
                        <option key={area.id} value={area.id}>
                          {area.name} - R$ {area.fee.toFixed(2)} {area.estimated_time ? `(${area.estimated_time})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <MapPin className="w-4 h-4" /> Endereço Completo
                  </label>
                  <input type="text" value={address} onChange={e => setAddress(e.target.value)} disabled={isBlocked} className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary focus:border-primary outline-none disabled:bg-gray-100" placeholder="Rua, Número, Ponto de Referência" required={orderType === 'delivery'} />
                </div>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setPaymentMethod('pix')}
                disabled={isBlocked}
                className={`py-2 flex flex-col items-center gap-1 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'pix' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} disabled:opacity-50`}
              >
                <QrCode className="w-5 h-5" />
                <span className="text-xs font-medium">PIX</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('card')}
                disabled={isBlocked}
                className={`py-2 flex flex-col items-center gap-1 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'card' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} disabled:opacity-50`}
              >
                <CreditCard className="w-5 h-5" />
                <span className="text-xs font-medium">Cartão</span>
              </button>
              <button 
                onClick={() => setPaymentMethod('money')}
                disabled={isBlocked}
                className={`py-2 flex flex-col items-center gap-1 border rounded-lg cursor-pointer transition-colors ${paymentMethod === 'money' ? 'border-primary bg-orange-50 text-primary' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} disabled:opacity-50`}
              >
                <Banknote className="w-5 h-5" />
                <span className="text-xs font-medium">Dinheiro</span>
              </button>
            </div>

            {paymentMethod === 'money' && (
              <div className="mt-3">
                <label className="block text-sm text-gray-600 mb-1">Troco para quanto?</label>
                <input type="number" value={changeFor} onChange={e => setChangeFor(e.target.value)} disabled={isBlocked} className="w-full border border-gray-300 rounded-lg px-4 py-2 outline-none focus:border-primary disabled:bg-gray-100" placeholder={`Ex: 50,00 (Opcional)`} />
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          {limitReached && (
            <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm text-center font-medium">
              A loja atingiu o limite de pedidos do mês. Não é possível realizar novos pedidos no momento.
            </div>
          )}
          <button 
            onClick={handleCheckout}
            disabled={items.length === 0 || !phone || !name || (orderType === 'delivery' && (!address || (deliveryAreas.length > 0 && !selectedAreaId))) || isBlocked || submitting || limitReached || (hasPreorderItems && !desiredDate)}
            className="w-full bg-primary hover:bg-primary disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl py-3 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            {submitting ? 'Processando...' : 'Enviar Pedido via WhatsApp'}
          </button>
        </div>
      </div>
    </div>
  );
}
