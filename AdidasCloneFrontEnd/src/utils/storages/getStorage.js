// src/utils/storage/getStorage.js
export const getStorage = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error(`Lỗi khi đọc ${key} từ localStorage:`, error);
    return null;
  }
};
