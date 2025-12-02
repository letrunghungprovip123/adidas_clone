// src/store/useSearchStore.js
import { create } from "zustand";

export const useSearchStore = create((set) => ({
  results: [],
  query: "",
  setResults: (data, query) => set({ results: data, query }),
  clearResults: () => set({ results: [], query: "" }),
}));
