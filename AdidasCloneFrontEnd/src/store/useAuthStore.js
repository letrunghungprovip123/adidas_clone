import { create } from "zustand";

export const useAuthStore = create((set) => ({
  email: "",
  setEmail: (email) => set({ email }),
  clearEmail: () => set({ email: "" }),
}));
