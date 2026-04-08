import { Tabs } from "expo-router"
import { zh } from "../../i18n/zh"

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#22c55e" }}>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="meal" options={{ title: zh.meal.title }} />
      <Tabs.Screen name="tracking" options={{ title: zh.tracking.title }} />
      <Tabs.Screen name="ingredients" options={{ title: zh.ingredients.title }} />
      <Tabs.Screen name="profile" options={{ title: zh.profile.title }} />
    </Tabs>
  )
}
