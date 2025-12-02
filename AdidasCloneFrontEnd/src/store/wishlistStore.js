// src/store/wishlistStore.js
import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  getWishlists,
  addToWishlist,
  removeFromWishlist,
} from "../api/wishlistApi";

export const useWishlistStore = create(
  devtools((set, get) => ({
    wishlist: [],
    loading: false,
    error: null,

    // ==== LẤY DANH SÁCH WISHLIST TỪ BACKEND ====
    fetchWishlist: async () => {
      try {
        set({ loading: true });

        const res = await getWishlists(); // <-- API của bạn
        const list = res.data?.data || res.data;

        set({
          wishlist: Array.isArray(list) ? list : [],
          loading: false,
          error: null,
        });
      } catch (err) {
        set({
          error: err.response?.data?.message || "Lỗi tải wishlist",
          loading: false,
        });
      }
    },

    // ==== THÊM SẢN PHẨM VÀO WISHLIST ====
    addItem: async (productId) => {
      try {
        await addToWishlist(productId);
        await get().fetchWishlist(); // cập nhật danh sách
      } catch (err) {
        throw err; // cho component xử lý toast
      }
    },

    // ==== XÓA KHỎI WISHLIST ====
    removeItem: async (productId) => {
      try {
        await removeFromWishlist(productId);
        await get().fetchWishlist();
      } catch (err) {
        throw err;
      }
    },

    // ==== KIỂM TRA SẢN PHẨM ĐÃ TỒN TẠI CHƯA ====
    exists: (productId) => {
      return get().wishlist.some(
        (item) => item.product_id === Number(productId)
      );
    },
  }))
);
