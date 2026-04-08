import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import {
  addFoodLog, addFoodLogFromPhoto, getDailySummary,
  getWeeklySummary, getMonthlySummary,
  FoodLogData, DailySummary, WeeklySummary, MonthlySummary
} from "../../services/tracking"
import { zh } from "../../i18n/zh"

const t = zh.tracking
const todayStr = () => new Date().toISOString().split("T")[0]

function ProgressBar({ value, target, color = "#22c55e" }: { value: number; target: number; color?: string }) {
  const pct = Math.min((value / (target || 1)) * 100, 100)
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  )
}
const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: "#e5e7eb", borderRadius: 4, marginVertical: 4 },
  fill: { height: 8, borderRadius: 4 },
})

export default function TrackingScreen() {
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily")
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [mealType, setMealType] = useState("breakfast")
  const [foodName, setFoodName] = useState("")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [fiber, setFiber] = useState("")
  const [analyzing, setAnalyzing] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const today = todayStr()
      if (tab === "daily") {
        const data = await getDailySummary(today)
        setDailySummary(data)
      } else if (tab === "weekly") {
        const data = await getWeeklySummary(today)
        setWeeklySummary(data)
      } else {
        const data = await getMonthlySummary(today)
        setMonthlySummary(data)
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => { loadData() }, [loadData])

  async function handleAddManual() {
    if (!foodName.trim() || !calories) return
    try {
      await addFoodLog({
        meal_type: mealType,
        input_method: "manual",
        date: todayStr(),
        food_items: [{
          name: foodName.trim(),
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          fiber: parseFloat(fiber) || 0,
          anti_inflammatory: 5
        }]
      })
      setFoodName(""); setCalories(""); setProtein(""); setFiber("")
      setShowAddModal(false)
      await loadData()
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  async function handlePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert("需要相机权限"); return }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
    if (result.canceled || !result.assets?.[0]?.base64) return
    setAnalyzing(true)
    setShowAddModal(false)
    try {
      await addFoodLogFromPhoto(mealType, result.assets[0].base64)
      await loadData()
    } catch {
      Alert.alert(zh.common.error, "分析失败，请重试")
    } finally {
      setAnalyzing(false)
    }
  }

  const mealLabel = (type: string) =>
    type === "breakfast" ? t.breakfast : type === "lunch" ? t.lunch : type === "dinner" ? t.dinner : t.snack

  return (
    <View style={styles.container}>
      {/* Tab 切换 */}
      <View style={styles.tabRow}>
        {(["daily", "weekly", "monthly"] as const).map((key) => (
          <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
              {key === "daily" ? t.daily : key === "weekly" ? t.weekly : t.monthly}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>

          {/* 今日视图 */}
          {tab === "daily" && dailySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>今日营养</Text>
                <Text style={styles.statLine}>{t.totalCalories}：<Text style={styles.bold}>{dailySummary.total_calories}</Text> / {dailySummary.target_calories?.toFixed(0)} kcal</Text>
                <ProgressBar value={dailySummary.total_calories} target={dailySummary.target_calories || 2000} />
                <Text style={styles.statLine}>{t.totalProtein}：<Text style={styles.bold}>{dailySummary.total_protein}g</Text> / {dailySummary.target_protein?.toFixed(0)}g</Text>
                <ProgressBar value={dailySummary.total_protein} target={dailySummary.target_protein || 100} color="#3b82f6" />
                <Text style={styles.statLine}>{t.totalFiber}：<Text style={styles.bold}>{dailySummary.total_fiber}g</Text> / 30g</Text>
                <ProgressBar value={dailySummary.total_fiber} target={30} color="#f59e0b" />
                <Text style={styles.statLine}>{t.antiInflammatory}：<Text style={styles.bold}>{dailySummary.anti_inflammatory_score}/10</Text></Text>
                <Text style={styles.statLine}>{t.exerciseBurned}：<Text style={styles.bold}>{dailySummary.exercise_calories_burned} kcal</Text></Text>
              </View>
              {dailySummary.logs.length === 0 ? (
                <Text style={styles.empty}>{t.noLogs}</Text>
              ) : (
                dailySummary.logs.map((log) => (
                  <View key={log.id} style={styles.logCard}>
                    <Text style={styles.mealLabel}>{mealLabel(log.meal_type)}</Text>
                    {log.food_items.map((item, i) => (
                      <Text key={i} style={styles.foodItem}>{item.name} — {item.calories}kcal · 蛋白质{item.protein}g</Text>
                    ))}
                    <Text style={styles.logTotal}>合计：{log.total_calories}kcal · {log.total_protein}g蛋白</Text>
                  </View>
                ))
              )}
            </View>
          )}

          {/* 周视图 */}
          {tab === "weekly" && weeklySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>本周趋势 ({weeklySummary.week_start} ~ {weeklySummary.week_end})</Text>
                <Text style={styles.statLine}>平均蛋白质：<Text style={styles.bold}>{weeklySummary.avg_protein}g/天</Text></Text>
                <Text style={styles.statLine}>平均膳食纤维：<Text style={styles.bold}>{weeklySummary.avg_fiber}g/天</Text></Text>
                <Text style={styles.statLine}>平均抗炎评分：<Text style={styles.bold}>{weeklySummary.avg_anti_inflammatory}/10</Text></Text>
                <Text style={styles.statLine}>运动总消耗：<Text style={styles.bold}>{weeklySummary.total_exercise_calories}kcal</Text></Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>每日热量</Text>
                {weeklySummary.daily_calories.map((d) => (
                  <View key={d.date} style={styles.dayRow}>
                    <Text style={styles.dayLabel}>{d.date.slice(5)}</Text>
                    <View style={{ flex: 1, marginHorizontal: 8 }}>
                      <ProgressBar value={d.calories} target={2000} />
                    </View>
                    <Text style={styles.dayValue}>{d.calories.toFixed(0)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* 月视图 */}
          {tab === "monthly" && monthlySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>{monthlySummary.month} 月度概览</Text>
                <Text style={styles.statLine}>记录天数：<Text style={styles.bold}>{monthlySummary.total_days_logged}天</Text></Text>
                <Text style={styles.statLine}>平均抗炎评分：<Text style={styles.bold}>{monthlySummary.avg_anti_inflammatory}/10</Text></Text>
              </View>
              {monthlySummary.body_metrics.length > 0 && (
                <View style={styles.statsCard}>
                  <Text style={styles.cardTitle}>体征变化</Text>
                  {monthlySummary.body_metrics.map((m) => (
                    <Text key={m.id} style={styles.statLine}>{m.date}：{m.weight}kg · 体脂{m.body_fat_pct}%</Text>
                  ))}
                </View>
              )}
            </View>
          )}

        </ScrollView>
      )}

      {analyzing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>{t.analyzing}</Text>
        </View>
      )}

      {/* 浮动添加按钮（仅今日视图） */}
      {tab === "daily" && (
        <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* 添加饮食弹窗 */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{t.addMeal}</Text>
            <Text style={styles.label}>{t.mealType}</Text>
            <View style={styles.mealTypeRow}>
              {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                <TouchableOpacity key={type}
                  style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                  onPress={() => setMealType(type)}>
                  <Text style={[styles.mealTypeTxt, mealType === type && styles.mealTypeTxtActive]}>
                    {mealLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={styles.input} placeholder={t.foodName} value={foodName} onChangeText={setFoodName} />
            <TextInput style={styles.input} placeholder={t.calories} value={calories} onChangeText={setCalories} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder={t.protein} value={protein} onChangeText={setProtein} keyboardType="numeric" />
            <TextInput style={styles.input} placeholder={t.fiber} value={fiber} onChangeText={setFiber} keyboardType="numeric" />
            <TouchableOpacity style={styles.addBtn} onPress={handleAddManual}>
              <Text style={styles.addBtnText}>{t.addManual}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#3b82f6", marginTop: 8 }]} onPress={handlePhoto}>
              <Text style={styles.addBtnText}>{t.addPhoto}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#9ca3af", marginTop: 8 }]} onPress={() => setShowAddModal(false)}>
              <Text style={styles.addBtnText}>{zh.common.cancel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#22c55e" },
  tabText: { fontSize: 14, color: "#9ca3af" },
  tabTextActive: { color: "#22c55e", fontWeight: "600" },
  content: { padding: 16, paddingBottom: 80 },
  statsCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 10, color: "#111827" },
  statLine: { fontSize: 14, color: "#374151", marginBottom: 4 },
  bold: { fontWeight: "bold" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 15 },
  logCard: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 8 },
  mealLabel: { fontSize: 13, color: "#22c55e", fontWeight: "600", marginBottom: 6 },
  foodItem: { fontSize: 14, color: "#374151", marginBottom: 2 },
  logTotal: { fontSize: 13, color: "#6b7280", marginTop: 6, fontStyle: "italic" },
  dayRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dayLabel: { width: 40, fontSize: 12, color: "#6b7280" },
  dayValue: { width: 40, fontSize: 12, color: "#374151", textAlign: "right" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  overlayText: { color: "#fff", marginTop: 12, fontSize: 15 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28, backgroundColor: "#22c55e", justifyContent: "center", alignItems: "center", elevation: 4 },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  label: { fontSize: 13, color: "#6b7280", marginBottom: 6 },
  mealTypeRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  mealTypeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" },
  mealTypeBtnActive: { backgroundColor: "#22c55e", borderColor: "#22c55e" },
  mealTypeTxt: { fontSize: 13, color: "#374151" },
  mealTypeTxtActive: { color: "#fff", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 15 },
  addBtn: { backgroundColor: "#22c55e", borderRadius: 8, padding: 12, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
})
