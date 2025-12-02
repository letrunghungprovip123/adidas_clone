import api from "./client";

export const getProductCategory = async (id, page, limit) => {
  const res = await api.get(
    `/products/category/${id}?page=${page}&limit=${limit}`
  );

  return res.data;
};

export const getProductById = async (id) => {
  const res = await api.get(`/products/${id}`);
  return res.data;
};

export const searchProduct = async (data) =>
  await api.get(`/products/search?q=${data}`);

export const aiGenerator = async (data) =>
  await api.post("/products/ai-suggest", data);
