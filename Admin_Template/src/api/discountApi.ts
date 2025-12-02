import api from "./client";

export const getDiscount = async () => await api.get("/discounts");

export const createDiscount = async (data: any) =>
  await api.post("/discounts", data);

export const updateDiscount = async (data: any, id: number) =>
  await api.patch(`/discounts/${id}`, data);

export const deleteDiscount = async (id: number) => {
  await api.delete(`/discounts/${id}`);
};
