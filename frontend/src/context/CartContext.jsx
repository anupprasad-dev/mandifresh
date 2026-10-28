import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DELIVERY_FEE, FREE_DELIVERY } from "../utils";

const CartContext = createContext(null);
export const useCart = () => useContext(CartContext);
const KEY = "mandifresh_cart_v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; }
}

export function CartProvider({ children }) {
  const [lines, setLines] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* storage unavailable */ }
  }, [lines]);

  // lines: [{ id, slug, name, price, unit, image_url, emoji, stock, qty }]
  const add = useCallback((p, qty = 1) => {
    setLines((cur) => {
      const found = cur.find((l) => l.id === p.id);
      const max = p.stock ?? 50;
      if (found) return cur.map((l) => (l.id === p.id ? { ...l, stock: max, price: p.price, qty: Math.min(l.qty + qty, max, 50) } : l));
      return [...cur, {
        id: p.id, slug: p.slug, name: p.name, price: Number(p.price), unit: p.unit,
        image_url: p.image_url, emoji: p.category?.emoji, stock: max, qty: Math.min(qty, max, 50),
      }];
    });
  }, []);
  const setQty = useCallback((id, qty) => {
    setLines((cur) => cur.flatMap((l) => {
      if (l.id !== id) return [l];
      const q = Math.min(qty, l.stock ?? 50, 50);
      return q < 1 ? [] : [{ ...l, qty: q }];
    }));
  }, []);
  const remove = useCallback((id) => setLines((cur) => cur.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
    const delivery = lines.length === 0 || subtotal >= FREE_DELIVERY ? 0 : DELIVERY_FEE;
    return { lines, count, subtotal, delivery, total: subtotal + delivery, add, setQty, remove, clear };
  }, [lines, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
