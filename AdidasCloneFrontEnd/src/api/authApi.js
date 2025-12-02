import axios from "axios";
import api from "./client";
import { getStorage } from "../utils/storages/getStorage";
// ---------------------------
// Auth API
// ---------------------------

const getAuthHeader = () => {
  const token = getStorage("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};
// Đăng ký
export const signup = async (data) => {
  const res = await api.post("/auth/signup", data);
  return res.data;
};

// Đăng nhập
export const login = async (data) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};

// Đổi mật khẩu (cần Bearer Token)
export const changePassword = async (data, token) => {
  const res = await api.patch("/auth/change-password", data, {
    headers: getAuthHeader(),
  });
  return res.data;
};

export const updateUser = async (data, id) => {
  const res = await api.patch(`/users/${id}`, data);
  return res.data;
};

// Quên mật khẩu (gửi OTP)
export const forgotPassword = async (data) => {
  const res = await api.post("/auth/forgot-password", data);
  return res.data;
};

// Xác minh OTP
export const verifyOtp = async (data) => {
  const res = await api.post("/auth/verify-otp", data);
  return res.data;
};

// Đặt lại mật khẩu
export const resetPassword = async (data) => {
  const res = await api.post("/auth/reset-password", data);
  return res.data;
};

export const socialLogin = async (data) =>
  await api.post("/auth/social-login", data);
