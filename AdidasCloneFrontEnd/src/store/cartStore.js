// src/store/cartStore.js
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [], // [{ product, size, quantity }]

      // Thêm vào giỏ
      addItem: (product, size) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.product.id === product.id && i.size === size
          );

          if (existing) {
            return {
              items: state.items.map((i) =>
                i.product.id === product.id && i.size === size
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            };
          }

          return {
            items: [...state.items, { product, size, quantity: 1 }],
          };
        });
      },

      // Cập nhật số lượng
      updateQuantity: (productId, size, change) => {
        set((state) => ({
          items: state.items
            .map((i) =>
              i.product.id === productId && i.size.size === size
                ? { ...i, quantity: Math.max(1, i.quantity + change) }
                : i
            )
            .filter((i) => i.quantity > 0),
        }));
      },

      // Cập nhật size + color
      updateItem: (productId, oldSizeObj, newSizeObj) => {
        set((state) => {
          return {
            items: state.items.map((i) => {
              if (
                i.product.id === productId &&
                i.size.size === oldSizeObj.size &&
                i.size.color === oldSizeObj.color
              ) {
                return { ...i, size: newSizeObj }; // cập nhật mới
              }
              return i;
            }),
          };
        });
      },

      // Xóa sản phẩm
      removeItem: (productId, size) => {
        set((state) => ({
          items: state.items.filter(
            (i) => !(i.product.id === productId && i.size.size === size)
          ),
        }));
      },

      // Xóa toàn bộ
      clearCart: () => set({ items: [] }),

      // Tính tổng
      getTotal: () =>
        get().items.reduce((sum, i) => sum + i.product.price * i.quantity, 0),

      // Số lượng sản phẩm
      getCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    {
      name: "cart-storage", // key trong localStorage
    }
  )
);
