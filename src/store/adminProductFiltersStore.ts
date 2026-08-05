import { create } from "zustand";

interface AdminProductFiltersState {
  categoryId: string;
  brand: string;
  search: string;
  setCategoryId: (v: string) => void;
  setBrand: (v: string) => void;
  setSearch: (v: string) => void;
  reset: () => void;
}

export const useAdminProductFiltersStore = create<AdminProductFiltersState>((set) => ({
  categoryId: "",
  brand: "",
  search: "",
  setCategoryId: (categoryId) => set({ categoryId }),
  setBrand: (brand) => set({ brand }),
  setSearch: (search) => set({ search }),
  reset: () => set({ categoryId: "", brand: "", search: "" }),
}));
