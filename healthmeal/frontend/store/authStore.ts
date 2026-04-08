import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface AuthState {
  token: string | null
  role: string | null
  language: string
  setAuth: (token: string, role: string, language: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  language: "zh",
  setAuth: async (token, role, language) => {
    await AsyncStorage.setItem("token", token)
    set({ token, role, language })
  },
  logout: async () => {
    await AsyncStorage.removeItem("token")
    set({ token: null, role: null })
  },
  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem("token")
    if (token) set({ token })
  },
}))
