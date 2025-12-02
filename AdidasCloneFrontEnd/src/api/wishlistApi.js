// src/api/wishlistApi.ts
import api from "./client";
import { getStorage } from "../utils/storages/getStorage";

// Lấy token từ localStorage
const getAuthHeader = () => {
  const token = getStorage("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Thêm vào wishlist
export const addToWishlist = async (product_id) => {
  return api.post("/favorites", { product_id }, { headers: getAuthHeader() });
};

// Xóa khỏi wishlist
export const removeFromWishlist = async (product_id) => {
  return api.delete(`/favorites/${product_id}`, {
    headers: getAuthHeader(),
  });
};
export const getWishlists = () =>
  api.get("/favorites", { headers: getAuthHeader() });
