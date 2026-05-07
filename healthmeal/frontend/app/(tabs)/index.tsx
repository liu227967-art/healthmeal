import { useState, useCallback } from "react"
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Modal } from "react-native"
import { useRouter } from "expo-router"
import { useFocusEffect } from "expo-router"
import { getDailySummary, DailySummary } from "../../services/tracking"
import { useAuthStore } from "../../store/authStore"
import { useTranslation } from "../../hooks/useTranslation"
import { CircleRing } from "../../components/CircleRing"

const todayStr = () => new Date().toISOString().split("T")[0]
const LANGUAGES = [{ code: "zh", label: "中文" }, { code: "en", label: "English" }]

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  const pct = Math.min((value / (target || 1)) * 100, 100)
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
        <Text style={{ fontSize: 12, color: "#6b7280" }}>{label}</Text>
        <Text style={{ fontSize: 12, color: "#1a1a1a", fontWeight: "600" }}>{value}<Text style={{ color: "#9ca3af" }}>/{target}g</Text></Text>
      </View>
      <View style={{ height: 6, backgroundColor: "#f3f4f6", borderRadius: 3 }}>
        <View style={{ height: 6, borderRadius: 3, backgroundColor: color, width: `${pct}%` as any }} />
      </View>
    </View>
  )
}

function QuickBtn({ icon, label, color, onPress }: { icon: string; label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[qs.btn, { backgroundColor: color + "15" }]} onPress={onPress} activeOpacity={0.7}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={[qs.label, { color }]}>{label}</Text>
    </TouchableOpacity>
  )
}
const qs = StyleSheet.create({
  btn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, gap: 6 },
  label: { fontSize: 12, fontWeight: "600" },
})

export default function HomeScreen() {
  const router = useRouter()
  const { language } = useAuthStore()
  const { t, setLanguage } = useTranslation()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)

  const load = useCallback(async () => {
    try { setSummary(await getDailySummary(todayStr())) } catch {
      // 网络失败静默处理，不影响页面展示
    }
    finally { setLoading(false); setRefreshing(false) }
  }, [])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const today = new Date()
  const th = t.home
  const dateStr = language === "zh"
    ? `${today.getMonth() + 1}月${today.getDate()}日`
    : `${today.toLocaleString("en", { month: "short" })} ${today.getDate()}`

  const targetCal = summary?.target_calories ?? 2000
  const consumed = summary?.total_calories ?? 0
  const remaining = Math.max(0, targetCal - consumed)
  const burned = summary?.exercise_calories_burned ?? 0

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load() }} tintColor="#16a34a" />}>

      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{th.greeting}</Text>
          <Text style={s.sub}>{dateStr} {th.weekdays[today.getDay()]}</Text>
        </View>
        <TouchableOpacity style={s.langBtn} onPress={() => setShowLangPicker(true)}>
          <Text style={s.langBtnText}>{language === "zh" ? "中文" : "EN"}</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showLangPicker} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowLangPicker(false)}>
          <View style={s.langMenu}>
            {LANGUAGES.map(({ code, label }) => (
              <TouchableOpacity key={code} style={[s.langOpt, language === code && s.langOptActive]}
                onPress={() => { setLanguage(code); setShowLangPicker(false) }}>
                <Text style={[s.langOptText, language === code && { color: "#16a34a", fontWeight: "600" }]}>{label}</Text>
                {language === code && <Text style={{ color: "#16a34a" }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 60 }} /> : (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>{th.todayOverview}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 20, marginTop: 12 }}>
              <CircleRing value={consumed} target={targetCal} size={110} strokeWidth={10} color="#16a34a" unit="kcal" />
              <View style={{ flex: 1, gap: 10 }}>
                <MacroBar label={th.protein} value={Math.round(summary?.total_protein ?? 0)} target={Math.round(summary?.target_protein ?? 120)} color="#3b82f6" />
                <MacroBar label={th.fiber} value={Math.round(summary?.total_fiber ?? 0)} target={30} color="#f59e0b" />
                <MacroBar label={th.antiScore} value={summary?.anti_inflammatory_score ?? 0} target={10} color="#16a34a" />
              </View>
            </View>
            <View style={s.calRow}>
              <View style={s.calItem}><Text style={s.calNum}>{remaining}</Text><Text style={s.calLabel}>{th.remaining}</Text></View>
              <View style={s.calItem}><Text style={[s.calNum, { color: "#f59e0b" }]}>{burned}</Text><Text style={s.calLabel}>{th.exerciseBurned}</Text></View>
              <View style={s.calItem}><Text style={[s.calNum, { color: "#16a34a" }]}>{targetCal}</Text><Text style={s.calLabel}>{th.target}</Text></View>
            </View>
          </View>

          <View style={[s.card, { paddingVertical: 16 }]}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <QuickBtn icon="🍽" label={th.logMeal} color="#16a34a" onPress={() => router.push("/(tabs)/tracking")} />
              <QuickBtn icon="🏃" label={th.exerciseBurned} color="#3b82f6" onPress={() => router.push({ pathname: "/(tabs)/tracking", params: { tab: "exercise" } })} />
              <QuickBtn icon="🛒" label={th.ingredients} color="#f59e0b" onPress={() => router.push({ pathname: "/(tabs)/tracking", params: { tab: "ingredients" } })} />
              <QuickBtn icon="🤖" label={th.genMeal} color="#8b5cf6" onPress={() => router.push("/(tabs)/meal")} />
            </View>
          </View>

          <TouchableOpacity style={s.banner} onPress={() => router.push("/(tabs)/meal")} activeOpacity={0.85}>
            <View>
              <Text style={s.bannerSub}>{th.todayRecommend}</Text>
              <Text style={s.bannerTitle}>{th.highProtein}</Text>
              <View style={s.bannerBtn}><Text style={s.bannerBtnText}>{th.viewRecommend}</Text></View>
            </View>
            <Text style={{ fontSize: 48 }}>🥗</Text>
          </TouchableOpacity>

          {summary && summary.logs.length > 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>{th.todayMeals}</Text>
              {(["breakfast","lunch","dinner","snack"] as const).map(type => {
                const logs = summary.logs.filter(l => l.meal_type === type)
                if (!logs.length) return null
                const cal = logs.reduce((a, l) => a + l.total_calories, 0)
                const foods = logs.flatMap(l => l.food_items.map(f => f.name))
                const icons: Record<string, string> = { breakfast: "🌅", lunch: "☀️", dinner: "🌙", snack: "🍎" }
                const labels: Record<string, string> = { breakfast: th.breakfast, lunch: th.lunch, dinner: th.dinner, snack: th.snack }
                return (
                  <View key={type} style={s.mealRow}>
                    <Text style={{ fontSize: 22, marginRight: 12 }}>{icons[type]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a" }}>{labels[type]}</Text>
                      <Text style={{ fontSize: 13, color: "#9ca3af" }} numberOfLines={1}>{foods.join("、")}</Text>
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: "#16a34a" }}>{cal.toFixed(0)} kcal</Text>
                  </View>
                )
              })}
            </View>
          )}
        </>
      )}
    </ScrollView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f7f2" },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  greeting: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  sub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "#e8f0e8", backgroundColor: "#fff" },
  langBtnText: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-start", alignItems: "flex-end", paddingTop: 100, paddingRight: 16 },
  langMenu: { backgroundColor: "#fff", borderRadius: 16, padding: 8, minWidth: 140, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  langOpt: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  langOptActive: { backgroundColor: "#f0fdf4" },
  langOptText: { fontSize: 15, color: "#1a1a1a" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  calRow: { flexDirection: "row", marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  calItem: { flex: 1, alignItems: "center" },
  calNum: { fontSize: 20, fontWeight: "bold", color: "#1a1a1a" },
  calLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },
  banner: { backgroundColor: "#166534", borderRadius: 16, padding: 20, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bannerSub: { fontSize: 12, color: "#86efac", marginBottom: 4 },
  bannerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff", marginBottom: 12 },
  bannerBtn: { backgroundColor: "#16a34a", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, alignSelf: "flex-start" },
  bannerBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  mealRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
})
