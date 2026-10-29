import { create } from 'zustand';

export interface CartItem {
  id: string; // unique item id (usually listingId)
  listingId: string;
  title: string;
  priceNgn: number;
  unit: string;
  quantity: number;
  maxQuantity: number;
  sellerId: string;
  sellerName: string;
  photo?: string;
  location?: string;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'id'>) => void;
  removeFromCart: (listingId: string) => void;
  updateQuantity: (listingId: string, quantity: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

const STORAGE_KEY = 'reva_cart_v1';

const getInitialItems = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse cart from storage:', e);
  }
  return [];
};

const saveItems = (items: CartItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save cart to storage:', e);
  }
};

export const useCartStore = create<CartState>((set, get) => ({
  items: getInitialItems(),

  addToCart: (itemData) => {
    set((state) => {
      const existingIndex = state.items.findIndex((i) => i.listingId === itemData.listingId);
      let updated: CartItem[];

      if (existingIndex > -1) {
        updated = [...state.items];
        const newQty = Math.min(
          updated[existingIndex].quantity + itemData.quantity,
          updated[existingIndex].maxQuantity || 9999
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
      } else {
        const newItem: CartItem = {
          ...itemData,
          id: itemData.listingId,
        };
        updated = [...state.items, newItem];
      }

      saveItems(updated);
      return { items: updated };
    });
  },

  removeFromCart: (listingId) => {
    set((state) => {
      const updated = state.items.filter((i) => i.listingId !== listingId);
      saveItems(updated);
      return { items: updated };
    });
  },

  updateQuantity: (listingId, quantity) => {
    set((state) => {
      if (quantity <= 0) {
        const updated = state.items.filter((i) => i.listingId !== listingId);
        saveItems(updated);
        return { items: updated };
      }
      const updated = state.items.map((i) => {
        if (i.listingId === listingId) {
          const clamped = Math.min(quantity, i.maxQuantity || 9999);
          return { ...i, quantity: clamped };
        }
        return i;
      });
      saveItems(updated);
      return { items: updated };
    });
  },

  clearCart: () => {
    saveItems([]);
    set({ items: [] });
  },

  getItemCount: () => {
    return get().items.reduce((total, i) => total + (i.quantity > 0 ? 1 : 0), 0);
  },

  getSubtotal: () => {
    return get().items.reduce((total, i) => total + i.priceNgn * i.quantity, 0);
  },
}));
