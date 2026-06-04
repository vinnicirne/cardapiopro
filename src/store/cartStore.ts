import { create } from 'zustand';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  imageUrl?: string;
  is_preorder?: boolean;
  preorder_notice?: string;
}

export interface SelectedOption {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // Unique cart item id (product id + hash of options)
  product: Product;
  quantity: number;
  observations?: string;
  selectedOptions?: SelectedOption[];
}

interface CartStore {
  items: CartItem[];
  addItem: (product: Product, quantity?: number, observations?: string, selectedOptions?: SelectedOption[]) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  addItem: (product, quantity = 1, observations = '', selectedOptions = []) => {
    set((state) => {
      // Sort options by ID to ensure consistent stringification for the hash
      const sortedOptions = [...selectedOptions].sort((a, b) => a.id.localeCompare(b.id));
      const optionsHash = sortedOptions.map(o => o.id).join('-');
      const cartItemId = `${product.id}-${optionsHash}`;

      const existingItem = state.items.find((item) => item.id === cartItemId);
      
      if (existingItem) {
        return {
          items: state.items.map((item) =>
            item.id === cartItemId
              ? { ...item, quantity: item.quantity + quantity, observations: observations || item.observations }
              : item
          ),
        };
      }
      
      return { items: [...state.items, { id: cartItemId, product, quantity, observations, selectedOptions }] };
    });
  },
  removeItem: (cartItemId) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== cartItemId),
    }));
  },
  updateQuantity: (cartItemId, quantity) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === cartItemId ? { ...item, quantity } : item
      ),
    }));
  },
  clearCart: () => set({ items: [] }),
  getTotal: () => {
    return get().items.reduce((total, item) => {
      const optionsTotal = item.selectedOptions?.reduce((sum, opt) => sum + opt.price, 0) || 0;
      return total + ((item.product.price + optionsTotal) * item.quantity);
    }, 0);
  },
}));
