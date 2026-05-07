import { create } from "zustand"
import AsyncStorage from "@react-native-async-storage/async-storage"

interface AuthState {
  token: string | null
  role: string | null
  language: string
  email: string | null
  setAuth: (token: string, role: string, language?: string, email?: string) => Promise<void>
  setLanguage: (language: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  role: null,
  language: "zh",
  email: null,
  setAuth: async (token, role, language = "zh", email) => {
    await AsyncStorage.setItem("token", token)
    await AsyncStorage.setItem("role", role)
    await AsyncStorage.setItem("language", language)
    if (email) await AsyncStorage.setItem("email", email)
    set({ token, role, language, email: email ?? null })
  },
  setLanguage: async (language) => {
    await AsyncStorage.setItem("language", language)
    set({ language })
  },
  logout: async () => {
    await AsyncStorage.multiRemove(["token", "role", "email", "language"])
    set({ token: null, role: null, email: null, language: "zh" })
  },
  loadFromStorage: async () => {
    const token = await AsyncStorage.getItem("token")
    const role = await AsyncStorage.getItem("role")
    const language = await AsyncStorage.getItem("language") || "zh"
    const email = await AsyncStorage.getItem("email")
    if (token) set({ token, role, language, email })
    else set({ language })
  },
}))
