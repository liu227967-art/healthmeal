import { Tabs } from "expo-router"
import { zh } from "../../i18n/zh"

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#22c55e" }}>
      <Tabs.Screen name="index" options={{ title: "首页" }} />
      <Tabs.Screen name="profile" options={{ title: zh.profile.title }} />
    </Tabs>
  )
}
