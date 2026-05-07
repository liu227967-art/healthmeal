// frontend/app/(tabs)/_layout.tsx
import { Tabs } from "expo-router"
import { View, TouchableOpacity, StyleSheet, Text } from "react-native"
import { useTranslation } from "../../hooks/useTranslation"
import { useRouter } from "expo-router"

function PlusButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={s.plusWrap} activeOpacity={0.85}>
      <View style={s.plusBtn}>
        <Text style={s.plusText}>＋</Text>
      </View>
    </TouchableOpacity>
  )
}

export default function TabLayout() {
  const { t } = useTranslation()
  const router = useRouter()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#16a34a",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: s.tabBar,
        tabBarLabelStyle: { fontSize: 11, marginBottom: 2 },
        headerStyle: { backgroundColor: "#fff" },
        headerShadowVisible: false,
        headerTitleStyle: { color: "#1a1a1a", fontWeight: "600", fontSize: 17 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.home.title, tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tabs.Screen name="tracking" options={{ title: "记录", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text> }} />
      <Tabs.Screen
        name="quick-add"
        options={{
          title: "",
          tabBarButton: () => <PlusButton onPress={() => router.push("/(tabs)/tracking")} />,
        }}
      />
      <Tabs.Screen name="meal" options={{ title: "发现", tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text> }} />
      <Tabs.Screen name="profile" options={{ title: t.profile.title, tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }} />
      {/* 隐藏旧 tab，保留路由可访问 */}
      <Tabs.Screen name="ingredients" options={{ href: null }} />
      <Tabs.Screen name="knowledge" options={{ href: null }} />
      <Tabs.Screen name="social" options={{ href: null }} />
    </Tabs>
  )
}

const s = StyleSheet.create({
  tabBar: { backgroundColor: "#fff", borderTopColor: "#e8f0e8", height: 60, paddingBottom: 6 },
  plusWrap: { top: -16, alignItems: "center", justifyContent: "center", width: 64 },
  plusBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center", shadowColor: "#16a34a", shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  plusText: { color: "#fff", fontSize: 28, lineHeight: 32, fontWeight: "300" },
})
