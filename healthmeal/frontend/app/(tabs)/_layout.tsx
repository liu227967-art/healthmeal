import { Tabs } from "expo-router"
import { useTranslation } from "../../hooks/useTranslation"

export default function TabLayout() {
  const { t } = useTranslation()
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: "#16a34a",
      tabBarInactiveTintColor: "#9ca3af",
      tabBarStyle: { backgroundColor: "#fff", borderTopColor: "#e8f0e8" },
      headerStyle: { backgroundColor: "#fff" },
      headerShadowVisible: false,
      headerTitleStyle: { color: "#1a1a1a", fontWeight: "600", fontSize: 17 },
    }}>
      <Tabs.Screen name="index" options={{ title: t.home.title }} />
      <Tabs.Screen name="meal" options={{ title: t.meal.title }} />
      <Tabs.Screen name="tracking" options={{ title: t.tracking.title }} />
      <Tabs.Screen name="ingredients" options={{ title: t.ingredients.title }} />
      <Tabs.Screen name="knowledge" options={{ title: t.knowledge.title }} />
      <Tabs.Screen name="social" options={{ title: t.social.title }} />
      <Tabs.Screen name="profile" options={{ title: t.profile.title }} />
    </Tabs>
  )
}
