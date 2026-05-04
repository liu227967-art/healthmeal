import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface AuthState {
  token: string | null
  role: string | null
  language: string
  setAuth: (token: string, role: string, language?: string) => Promise<void>
  setLanguage: (language: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  language: "zh",
  setAuth: async (token, role, language = "zh") => {
    await AsyncStorage.setItem("token", token)
    await AsyncStorage.setItem("role", role)
    await AsyncStorage.setItem("language", language)
    set({ token, role, language })
  },
  setLanguage: async (language) => {
    await AsyncStorage.setItem("language", language)
    set({ language })
  },
  logout: async () => {
    await AsyncStorage.multiRemove(["token", "role"])
    set({ token: null, role: null })
  },
  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem("token")
    const role = await AsyncStorage.getItem("role")
    const language = await AsyncStorage.getItem("language") || "zh"
    if (token) set({ token, role, language })
    else set({ language })
  },
}))
