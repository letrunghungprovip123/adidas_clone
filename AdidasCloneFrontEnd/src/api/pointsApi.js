import api from "./client";
import { getStorage } from "../utils/storages/getStorage";

const getAuthHeader = () => {
  const token = getStorage("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const addPoints = (data) => {
  console.log(getAuthHeader());
  api.post("/loyalty-point", data, { headers: getAuthHeader() });
};

export const getPointsUser = () => {
  console.log(getAuthHeader());
  return api.get("/loyalty-point/me", { headers: getAuthHeader() });
};
