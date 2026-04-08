import { useEffect } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { useAuthStore } from "../store/authStore"

export default function RootLayout() {
  const { token, loadFromStorage } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    loadFromStorage()
  }, [])

  useEffect(() => {
    const inAuth = segments[0] === "(auth)"
    if (!token && !inAuth) router.replace("/(auth)/login")
    if (token && inAuth) router.replace("/(tabs)/")
  }, [token, segments])

  return <Stack screenOptions={{ headerShown: false }} />
}
