import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Modal
} from "react-native"
import { useRouter } from "expo-router"
import { useFocusEffect } from "expo-router"
import { getDailySummary, DailySummary } from "../../services/tracking"
import { useAuthStore } from "../../store/authStore"
import { useTranslation } from "../../hooks/useTranslation"

const todayStr = () => new Date().toISOString().split("T")[0]

const LANGUAGES = [
  { code: "zh", label: "中文" },
  { code: "en", label: "English" },
]

function ProgressRing({ value, target, color = "#16a34a" }: { value: number; target: number; color?: string }) {
  const pct = Math.min((value / (target || 1)) * 100, 100)
  return (
    <View style={ring.track}>
      <View style={[ring.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  )
}
const ring = StyleSheet.create({
  track: { height: 10, backgroundColor: "#e8f0e8", borderRadius: 5, marginTop: 6, marginBottom: 2 },
  fill: { height: 10, borderRadius: 5 },
})

function NutrientCard({
  label, value, target, unit, color,
}: { label: string; value: number; target: number | null; unit: string; color: string }) {
  return (
    <View style={styles.nutriCard}>
      <Text style={[styles.nutriLabel, { color }]}>{label}</Text>
      <Text style={styles.nutriValue}>
        <Text style={styles.nutriBig}>{value}</Text>
        {target ? ` / ${target.toFixed(0)}` : ""}
        <Text style={styles.nutriUnit}> {unit}</Text>
      </Text>
      {target ? <ProgressRing value={value} target={target} color={color} /> : null}
    </View>
  )
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: "早餐",
  lunch: "午餐",
  dinner: "晚餐",
  snack: "加餐",
}
const MEAL_ICONS: Record<string, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
}

export default function HomeScreen() {
  const router = useRouter()
  const { language } = useAuthStore()
  const { t, setLanguage } = useTranslation()
  const [summary, setSummary] = useState<DailySummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showLangPicker, setShowLangPicker] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getDailySummary(todayStr())
      setSummary(data)
    } catch {
      // 网络失败静默处理
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useFocusEffect(useCallback(() => { load() }, [load]))

  const onRefresh = () => {
    setRefreshing(true)
    load()
  }

  const today = new Date()
  const th = t.home
  const dateStr = language === "zh"
    ? `${today.getMonth() + 1}月${today.getDate()}日`
    : `${today.toLocaleString("en", { month: "short" })} ${today.getDate()}`
  const weekday = th.weekdays[today.getDay()]

  const calorieLeft = summary
    ? Math.max(0, (summary.target_calories ?? 2000) - summary.total_calories)
    : null

  const antiScore = summary?.anti_inflammatory_score ?? 0
  const antiColor = antiScore >= 7 ? "#16a34a" : antiScore >= 4 ? "#f59e0b" : "#ef4444"

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16a34a" />}
    >
      {/* 顶部问候 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{th.greeting}</Text>
          <Text style={styles.dateText}>{dateStr} {weekday}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.langBtn} onPress={() => setShowLangPicker(true)}>
            <Text style={styles.langBtnText}>{language === "zh" ? "中文" : language === "en" ? "EN" : language.toUpperCase()}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push("/(tabs)/profile")}>
            <Text style={styles.profileIcon}>👤</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 语言选择弹窗 */}
      <Modal visible={showLangPicker} transparent animationType="fade">
        <TouchableOpacity style={styles.langOverlay} activeOpacity={1} onPress={() => setShowLangPicker(false)}>
          <View style={styles.langMenu}>
            <Text style={styles.langMenuTitle}>选择语言</Text>
            {LANGUAGES.map(({ code, label }) => (
              <TouchableOpacity key={code} style={[styles.langOption, language === code && styles.langOptionActive]}
                onPress={() => { setLanguage(code); setShowLangPicker(false) }}>
                <Text style={[styles.langOptionText, language === code && styles.langOptionTextActive]}>{label}</Text>
                {language === code && <Text style={styles.langCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {loading ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 60 }} />
      ) : (
        <>
          {/* 热量总览卡片 */}
          <View style={styles.calorieCard}>
            <View style={styles.calorieRow}>
              <View style={styles.calorieMain}>
                <Text style={styles.calorieNum}>{summary?.total_calories ?? 0}</Text>
                <Text style={styles.calorieLabel}>{th.consumed}</Text>
              </View>
              <View style={styles.calorieDivider} />
              <View style={styles.calorieItem}>
                <Text style={styles.calorieItemNum}>{summary?.exercise_calories_burned ?? 0}</Text>
                <Text style={styles.calorieItemLabel}>{th.exerciseBurned}</Text>
              </View>
              <View style={styles.calorieDivider} />
              <View style={styles.calorieItem}>
                <Text style={[styles.calorieItemNum, { color: "#16a34a" }]}>{calorieLeft ?? "—"}</Text>
                <Text style={styles.calorieItemLabel}>{th.remaining}</Text>
              </View>
            </View>
            {summary?.target_calories ? (
              <ProgressRing value={summary.total_calories} target={summary.target_calories} color="#16a34a" />
            ) : null}
          </View>

          {/* 营养素卡片 */}
          <View style={styles.nutriRow}>
            <NutrientCard
              label={th.protein}
              value={summary?.total_protein ?? 0}
              target={summary?.target_protein ?? null}
              unit="g"
              color="#3b82f6"
            />
            <NutrientCard
              label={th.fiber}
              value={summary?.total_fiber ?? 0}
              target={30}
              unit="g"
              color="#f59e0b"
            />
            <View style={styles.nutriCard}>
              <Text style={[styles.nutriLabel, { color: antiColor }]}>{th.antiScore}</Text>
              <Text style={[styles.nutriBig, { color: antiColor }]}>{antiScore}</Text>
              <Text style={styles.nutriUnit}>/10</Text>
            </View>
          </View>

          {/* 今日餐次 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{th.todayMeals}</Text>
            {summary && summary.logs.length > 0 ? (
              (() => {
                const order = ["breakfast", "lunch", "dinner", "snack"]
                const mealLabels: Record<string, string> = {
                  breakfast: th.breakfast, lunch: th.lunch,
                  dinner: th.dinner, snack: th.snack,
                }
                const groups: Record<string, typeof summary.logs> = {}
                summary.logs.forEach(log => {
                  if (!groups[log.meal_type]) groups[log.meal_type] = []
                  groups[log.meal_type].push(log)
                })
                return order.filter(k => groups[k]).map(type => {
                  const logs = groups[type]
                  const totalCal = logs.reduce((s, l) => s + l.total_calories, 0)
                  const allFoods = logs.flatMap(l => l.food_items.map(f => f.name))
                  return (
                    <View key={type} style={styles.mealRow}>
                      <Text style={styles.mealIcon}>{MEAL_ICONS[type] ?? "🍽"}</Text>
                      <View style={styles.mealInfo}>
                        <Text style={styles.mealType}>{mealLabels[type] ?? type}</Text>
                        <Text style={styles.mealItems} numberOfLines={1}>
                          {allFoods.join("、")}
                        </Text>
                      </View>
                      <Text style={styles.mealCal}>{totalCal.toFixed(0)} kcal</Text>
                    </View>
                  )
                })
              })()
            ) : (
              <Text style={styles.emptyText}>{th.noRecord}</Text>
            )}
          </View>

          {/* 快捷操作 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{th.quickActions}</Text>
            <View style={styles.quickRow}>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#16a34a" }]}
                onPress={() => router.push("/(tabs)/tracking")}
              >
                <Text style={styles.quickIcon}>✏️</Text>
                <Text style={styles.quickLabel}>{th.logMeal}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#3b82f6" }]}
                onPress={() => router.push("/(tabs)/meal")}
              >
                <Text style={styles.quickIcon}>🍽</Text>
                <Text style={styles.quickLabel}>{th.genMeal}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#f59e0b" }]}
                onPress={() => router.push("/(tabs)/ingredients")}
              >
                <Text style={styles.quickIcon}>🛒</Text>
                <Text style={styles.quickLabel}>{th.ingredients}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { backgroundColor: "#8b5cf6" }]}
                onPress={() => router.push("/(tabs)/knowledge")}
              >
                <Text style={styles.quickIcon}>📚</Text>
                <Text style={styles.quickLabel}>{th.knowledge}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f7f2" },
  content: { padding: 16, paddingBottom: 40 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greeting: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  dateText: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  langBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: "#e8f0e8", backgroundColor: "#fff" },
  langBtnText: { fontSize: 13, color: "#16a34a", fontWeight: "600" },
  profileBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#e8f0e8", justifyContent: "center", alignItems: "center" },
  profileIcon: { fontSize: 18 },
  langOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "flex-start", alignItems: "flex-end", paddingTop: 100, paddingRight: 16 },
  langMenu: { backgroundColor: "#fff", borderRadius: 16, padding: 8, minWidth: 140, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  langMenuTitle: { fontSize: 12, color: "#9ca3af", paddingHorizontal: 12, paddingVertical: 6 },
  langOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10 },
  langOptionActive: { backgroundColor: "#f0fdf4" },
  langOptionText: { fontSize: 15, color: "#1a1a1a" },
  langOptionTextActive: { color: "#16a34a", fontWeight: "600" },
  langCheck: { color: "#16a34a", fontSize: 16, fontWeight: "bold" },

  calorieCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  calorieRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  calorieMain: { alignItems: "center", flex: 1.5 },
  calorieNum: { fontSize: 36, fontWeight: "bold", color: "#16a34a" },
  calorieLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  calorieDivider: { width: 1, height: 40, backgroundColor: "#e8f0e8" },
  calorieItem: { flex: 1, alignItems: "center" },
  calorieItemNum: { fontSize: 20, fontWeight: "bold", color: "#1a1a1a" },
  calorieItemLabel: { fontSize: 11, color: "#9ca3af", marginTop: 2 },

  nutriRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  nutriCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 14, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  nutriLabel: { fontSize: 12, fontWeight: "600", marginBottom: 4 },
  nutriValue: { flexDirection: "row", alignItems: "baseline" },
  nutriBig: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a" },
  nutriUnit: { fontSize: 11, color: "#9ca3af" },

  section: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  sectionTitle: { fontSize: 17, fontWeight: "600", color: "#1a1a1a", marginBottom: 14 },

  mealRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f2f7f2" },
  mealIcon: { fontSize: 22, marginRight: 12 },
  mealInfo: { flex: 1 },
  mealType: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  mealItems: { fontSize: 13, color: "#9ca3af", marginTop: 2 },
  mealCal: { fontSize: 14, fontWeight: "600", color: "#16a34a" },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: 15, paddingVertical: 20 },

  quickRow: { flexDirection: "row", gap: 10 },
  quickBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", justifyContent: "center" },
  quickIcon: { fontSize: 24, marginBottom: 6 },
  quickLabel: { fontSize: 12, color: "#fff", fontWeight: "600" },
})
