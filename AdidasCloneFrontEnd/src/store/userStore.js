// src/store/userStore.js
import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import api from "../api/client";
import { getStorage } from "../utils/storages/getStorage";
const useUserStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: false,
      initialized: false,

      fetchUser: async () => {
        const token = getStorage("access_token");
        if (!token) return;

        set({ loading: true });
        try {
          const res = await api.get("/users/getById", {
            headers: { Authorization: `Bearer ${token}` },
          });
          set({ user: res.data.data, loading: false });
        } catch (err) {
          console.error(err);
          set({ user: null, loading: false });
        }
      },
    }),
    {
      name: "user-store",
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state, error) => {
        // Đợi 1 tick để chắc chắn đã hydrate
        setTimeout(() => {
          useUserStore.setState({ initialized: true });
        }, 0);
      },
    }
  )
);

export default useUserStore;
