import { create } from "zustand";
import { User } from "../services/authService"; // Assuming authService is in ../services

// Enhanced role-based state management:
// TODO: Add role-specific UI permissions state
// TODO: Implement employee assignment preferences storage
// TODO: Add department context for role-based operations
// TODO: Implement role-based navigation and access control

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  selectedCompanyId: string | null; // Renamed from selectedBranchContext
  setUser: (user: User | null) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setSelectedCompanyId: (companyId: string | null) => void; // Renamed from setSelectedBranchContext
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  selectedCompanyId: null, // Renamed
  setUser: (user) => set({ user }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  setSelectedCompanyId: (companyId) => set({ selectedCompanyId: companyId }), // Renamed
  clearAuth: () =>
    set({ isAuthenticated: false, user: null, selectedCompanyId: null }), // Updated
}));
