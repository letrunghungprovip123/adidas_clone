// src/utils/storage/setStorage.js
export const setStorage = (key, value) => {
  try {
    const data = JSON.stringify(value);
    localStorage.setItem(key, data);
  } catch (error) {
    console.error(`Lỗi khi lưu ${key} vào localStorage:`, error);
  }
};
