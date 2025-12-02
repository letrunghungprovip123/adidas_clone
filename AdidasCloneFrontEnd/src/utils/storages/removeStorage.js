// src/utils/storage/removeStorage.js
export const removeStorage = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Lỗi khi xóa ${key} khỏi localStorage:`, error);
  }
};
