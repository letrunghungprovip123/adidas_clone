import api from "./client";

export const login = async (data: any) => await api.post("/auth/login", data);
