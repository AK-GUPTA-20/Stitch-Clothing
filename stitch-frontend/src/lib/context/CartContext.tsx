import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getColorLabel, getSizeLabel } from '@/lib/utils';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size: string;
  color: string;
  quantity: number;
  slug?: string;
}

// use shared label helpers from src/lib/utils.ts

interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  add: (item: Omit<CartItem, "quantity">) => void;
  remove: (id: string, size: string, color: string) => void;
  updateQty: (id: string, size: string, color: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("stitch_cart");
      if (saved) {
        const parsed = JSON.parse(saved);
        setItems(Array.isArray(parsed)
          ? parsed.map((item) => ({
              ...item,
              color: getColorLabel(item?.color),
              size: getSizeLabel(item?.size),
            }))
          : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem("stitch_cart", JSON.stringify(items));
  }, [items]);

  const add = useCallback((newItem: Omit<CartItem, "quantity">) => {
    const normalizedItem = {
      ...newItem,
      color: getColorLabel(newItem.color),
      size: getSizeLabel(newItem.size),
    };
    setItems((prev) => {
      const idx = prev.findIndex(
        (i) => i.id === normalizedItem.id && i.size === normalizedItem.size && i.color === normalizedItem.color
      );
      if (idx > -1) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + 1 };
        return updated;
      }
      return [...prev, { ...normalizedItem, quantity: 1 }];
    });
    setIsOpen(true);
  }, []);

  const remove = useCallback((id: string, size: string, color: string) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.size === size && i.color === color)));
  }, []);

  const updateQty = useCallback((id: string, size: string, color: string, qty: number) => {
    if (qty < 1) { remove(id, size, color); return; }
    setItems((prev) =>
      prev.map((i) => i.id === id && i.size === size && i.color === color ? { ...i, quantity: qty } : i)
    );
  }, [remove]);

  const clear = useCallback(() => setItems([]), []);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);

  return (
    <CartContext.Provider value={{ items, isOpen, setIsOpen, add, remove, updateQty, clear, total, count }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
