import api from "./client";

export const getReviewByProduct = async (productId) => {
  const res = await api.get(`/reviews/${productId}`);
  return res.data.data; // ✅ chính xác: lấy "data" bên trong
};

// 🔹 Tạo review mới
export const createReview = async (reviewData) => {
  const res = await api.post("/reviews", reviewData);
  return res.data.data; // ✅ thống nhất định dạng
};
