import api from "./client";

export const getProduct = async () => await api.get("/products");

export const createProduct = async (data: any) =>
  await api.post("/products", data);

export const updateProduct = async (data: any, id: number) =>
  await api.patch(`/products/${id}`, data);

export const deleteProduct = async (id: number) =>
  await api.delete(`products/${id}`);

export const getCategory = async () => await api.get("/categories");

export const getProductById = async (id: number) => {
  return await api.get(`/products/${id}`);
};

export const createProductVariant = async (data: any) =>
  await api.post("/products/product-variant", data);

export const updateProductVariant = async (data: any, id: number) =>
  await api.patch(`/products/product-variant/${id}`, data);

export const createImageProduct = async (
  file: File,
  product_id: number,
  alt_text: string
) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("product_id", String(product_id));
  formData.append("alt_text", alt_text);

  return await api.post("/products/product-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
