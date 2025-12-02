import api from "./client";

export const getAllOrder = async () => await api.get("/orders/all-orders");

export const getOrderById = async (id: number) =>
  await api.get(`/orders/all-orders/${id}`);

export const updateStatus = async (data: any, id: number) => {
  return await api.patch(`/orders/${id}/status`, data);
};
