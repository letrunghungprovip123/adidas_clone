// src/api/orderApi.js
import api from "./client";
import { getStorage } from "../utils/storages/getStorage";

const getAuthHeader = () => {
  const token = getStorage("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const applyDiscount = (data) =>
  api.post("/discounts/apply", data, { headers: getAuthHeader() });

export const createPaymentIntent = (amount) =>
  api.post("/orders/paymentIntent", { amount });

export const createOrder = (data) =>
  api.post("/orders", data, { headers: getAuthHeader() });

export const getOrderUserId = () =>
  api.get("/orders", { headers: getAuthHeader() });

export const getOrderUserIdByOrderId = (id) =>
  api.get(`/orders/${id}`, { headers: getAuthHeader() });


export const createGuestOrder = (data) =>
  api.post("/orders/guest-checkout", data);
