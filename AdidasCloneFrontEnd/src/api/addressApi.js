// src/api/addressApi.js
import api from "./client";
import { getStorage } from "../utils/storages/getStorage";

const getAuthHeader = () => {
  const token = getStorage("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getAddresses = () =>
  api.get("/addresses/byId", { headers: getAuthHeader() });

export const addAddress = (data) =>
  api.post("/addresses", data, { headers: getAuthHeader() });

export const updateAddress = (id, data) => api.patch(`/addresses/${id}`, data);

export const deleteAddress = (id) => api.delete(`/addresses/${id}`);
