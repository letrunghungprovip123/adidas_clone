import api from "./client";

export const getUser = async () => await api.get("/users");

export const createUser = async (data: any) => await api.post("/users", data);

export const updateUser = async (id: number, data: any) =>
  await api.patch(`/users/${id}`, data);

export const deleteUser = async (id: number) =>
  await api.delete(`/users/${id}`);

export const getUserById = async () => {
  const adminToken = localStorage.getItem("admin_token");

  return await api.get("/users/getById", {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
};
