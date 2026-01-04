import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from '../types';

export interface CartItem {
  product_id: string;
  quantity: number;
  customPrice?: string; // Optional custom price, defaults to product.total_cost
  product?: Product; // Store product data for display
}

interface CartContextType {
  cartItems: CartItem[];
  channel: 'online' | 'offline' | null;
  platformId: string | null;
  notes: string;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateCustomPrice: (productId: string, price: string) => void;
  setChannel: (channel: 'online' | 'offline' | null) => void;
  setPlatformId: (platformId: string | null) => void;
  setNotes: (notes: string) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getItemCount: () => number;
  getProductQuantity: (productId: string) => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [channel, setChannel] = useState<'online' | 'offline' | null>(null);
  const [platformId, setPlatformId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (error) {
        console.error('Failed to load cart from localStorage:', error);
      }
    }
    const savedCartMeta = localStorage.getItem('cartMeta');
    if (savedCartMeta) {
      try {
        const meta = JSON.parse(savedCartMeta);
        setChannel(meta.channel || null);
        setPlatformId(meta.platformId || null);
        setNotes(meta.notes || '');
      } catch (error) {
        console.error('Failed to load cart metadata from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cartItems));
  }, [cartItems]);

  // Save cart metadata to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('cartMeta', JSON.stringify({ channel, platformId, notes }));
  }, [channel, platformId, notes]);

  const addToCart = (product: Product, quantity: number = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.product_id === product.product_id);
      if (existingItem) {
        // Update quantity if item already exists, keeping the product data
        return prevItems.map((item) =>
          item.product_id === product.product_id
            ? { ...item, quantity: item.quantity + quantity, product }
            : item
        );
      } else {
        // Add new item with product data
        return [...prevItems, { product_id: product.product_id, quantity, product }];
      }
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateCustomPrice = (productId: string, price: string) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.product_id === productId ? { ...item, customPrice: price } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setChannel(null);
    setPlatformId(null);
    setNotes('');
    localStorage.removeItem('cart');
    localStorage.removeItem('cartMeta');
  };

  const getTotalAmount = (): number => {
    return cartItems.reduce((total, item) => {
      const price = item.customPrice
        ? parseFloat(item.customPrice)
        : item.product?.total_cost
        ? parseFloat(item.product.total_cost)
        : 0;
      return total + price * item.quantity;
    }, 0);
  };

  const getItemCount = (): number => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  const getProductQuantity = (productId: string): number => {
    const item = cartItems.find((item) => item.product_id === productId);
    return item ? item.quantity : 0;
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        channel,
        platformId,
        notes,
        addToCart,
        removeFromCart,
        updateQuantity,
        updateCustomPrice,
        setChannel,
        setPlatformId,
        setNotes,
        clearCart,
        getTotalAmount,
        getItemCount,
        getProductQuantity,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

