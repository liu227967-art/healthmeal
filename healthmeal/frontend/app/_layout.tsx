import { useEffect, useState } from "react"
import { Stack, useRouter, useSegments } from "expo-router"
import { useAuthStore } from "../store/authStore"

export default function RootLayout() {
  const { token, loadFromStorage } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadFromStorage().finally(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    const inAuth = segments[0] === "(auth)"
    if (!token && !inAuth) router.replace("/(auth)/login")
    if (token && inAuth) router.replace("/(tabs)/")
  }, [loaded, token, segments])

  return <Stack screenOptions={{ headerShown: false }} />
}
