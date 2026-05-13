import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  TextInput, StyleSheet, Alert, ActivityIndicator, Modal,
  KeyboardAvoidingView, Platform, Keyboard
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { useLocalSearchParams, useFocusEffect } from "expo-router"
import {
  addFoodLog, addFoodLogFromPhoto, deleteFoodLog, getDailySummary,
  getWeeklySummary, getMonthlySummary, logExercise, estimateNutrition,
  FoodLogData, DailySummary, WeeklySummary, MonthlySummary
} from "../../services/tracking"
import { useTranslation } from "../../hooks/useTranslation"
import {
  getIngredients, addIngredient, deleteIngredient,
  IngredientData
} from "../../services/meal"
import { localDateStr as todayStr } from "../../utils/date"
import { SegmentedControl } from "../../components/SegmentedControl"

function ProgressBar({ value, target, color = "#16a34a" }: { value: number; target: number; color?: string }) {
  const pct = Math.min((value / (target || 1)) * 100, 100)
  return (
    <View style={pb.track}>
      <View style={[pb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
    </View>
  )
}
const pb = StyleSheet.create({
  track: { height: 8, backgroundColor: "#e8f0e8", borderRadius: 4, marginVertical: 4 },
  fill: { height: 8, borderRadius: 4 },
})

export default function TrackingScreen() {
  const { t: i18n, language } = useTranslation()
  const t = i18n.tracking
  const te = i18n.exercise
  const params = useLocalSearchParams<{ tab?: string }>()
  const [mainTab, setMainTab] = useState<"food" | "exercise" | "ingredients">("food")
  const [tab, setTab] = useState<"daily" | "weekly" | "monthly">("daily")

  // 支持从首页快捷按钮直接跳转到指定 tab
  useEffect(() => {
    if (params.tab === "exercise") setMainTab("exercise")
    else if (params.tab === "ingredients") setMainTab("ingredients")
  }, [params.tab])
  const [ingredients, setIngredients] = useState<IngredientData[]>([])
  const [ingName, setIngName] = useState("")
  const [ingQty, setIngQty] = useState("100")
  const [ingUnit, setIngUnit] = useState("g")
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null)
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [exerciseType, setExerciseType] = useState<"cardio" | "strength">("cardio")
  const [exerciseActivity, setExerciseActivity] = useState("walking")
  const [exerciseDuration, setExerciseDuration] = useState("")
  const [exerciseSets, setExerciseSets] = useState("")
  const [exerciseReps, setExerciseReps] = useState("")
  const [exerciseWeight, setExerciseWeight] = useState("")
  const [strengthExercise, setStrengthExercise] = useState("squat")
  const [customExercise, setCustomExercise] = useState("")
  const [exerciseIntensity, setExerciseIntensity] = useState("moderate")
  const [mealType, setMealType] = useState("breakfast")
  const [foodName, setFoodName] = useState("")
  const [quantity, setQuantity] = useState("100")
  const [unit, setUnit] = useState("g")
  const [calories, setCalories] = useState("")
  const [protein, setProtein] = useState("")
  const [fiber, setFiber] = useState("")
  const [estimating, setEstimating] = useState(false)
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
      Alert.alert(i18n.common.error)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useFocusEffect(useCallback(() => { loadData() }, [loadData]))

  // 切换到运动 tab 时确保 daily 数据已加载（运动消耗来自 dailySummary）
  useEffect(() => {
    if (mainTab === "exercise" && !dailySummary) {
      getDailySummary(todayStr()).then(setDailySummary).catch(() => {})
    }
  }, [mainTab])

  const loadIngredients = useCallback(async () => {
    try { setIngredients(await getIngredients(todayStr())) } catch (e) {
      // 静默失败，离线时不报错
    }
  }, [])

  useFocusEffect(useCallback(() => { loadIngredients() }, [loadIngredients]))

  async function handleAddIngredient() {
    if (!ingName.trim()) return
    try {
      await addIngredient({ name: ingName.trim(), quantity: parseFloat(ingQty) || 100, unit: ingUnit, input_method: "manual", date: todayStr() })
      setIngName("")
      await loadIngredients()
    } catch { Alert.alert(i18n.common.error) }
  }

  async function handleDeleteIngredient(id: number) {
    try { await deleteIngredient(id); await loadIngredients() }
    catch { Alert.alert(i18n.common.error) }
  }

  async function handleDeleteFoodLog(id: number) {
    Alert.alert(
      language === "zh" ? "删除记录" : "Delete log",
      language === "zh" ? "确认删除这条饮食记录？" : "Delete this food log entry?",
      [
        { text: i18n.common.cancel, style: "cancel" },
        {
          text: language === "zh" ? "删除" : "Delete", style: "destructive",
          onPress: async () => {
            try { await deleteFoodLog(id); await loadData() }
            catch { Alert.alert(i18n.common.error) }
          }
        }
      ]
    )
  }

  async function handleAddManual() {
    if (!foodName.trim()) { Alert.alert(i18n.common.error, t.foodName); return }
    const foodNameWithQty = quantity && unit ? `${foodName.trim()} (${quantity}${unit})` : foodName.trim()
    try {
      await addFoodLog({
        meal_type: mealType,
        input_method: "manual",
        date: todayStr(),
        food_items: [{
          name: foodNameWithQty,
          calories: parseFloat(calories) || 0,
          protein: parseFloat(protein) || 0,
          fiber: parseFloat(fiber) || 0,
          anti_inflammatory: 5
        }]
      })
      setFoodName(""); setQuantity("100"); setUnit("g")
      setCalories(""); setProtein(""); setFiber("")
      setShowAddModal(false)
      await loadData()
    } catch {
      Alert.alert(i18n.common.error)
    }
  }

  async function handleAIEstimate() {
    if (!foodName.trim()) { Alert.alert(i18n.common.error, t.foodName); return }
    setEstimating(true)
    try {
      const result = await estimateNutrition(foodName.trim(), parseFloat(quantity) || 100, unit)
      setCalories(String(Math.round(result.calories)))
      setProtein(String(Math.round(result.protein * 10) / 10))
      setFiber(String(Math.round(result.fiber * 10) / 10))
    } catch {
      Alert.alert(i18n.common.error, t.estimateFail)
    } finally {
      setEstimating(false)
    }
  }

  async function handleLogExercise() {
    if (exerciseType === "cardio" && (!exerciseDuration.trim() || parseFloat(exerciseDuration) <= 0)) {
      Alert.alert(i18n.common.error, te.duration)
      return
    }
    const detail = exerciseType === "cardio"
      ? { activity: exerciseActivity, duration_min: parseFloat(exerciseDuration) || 0, intensity: exerciseIntensity }
      : { exercise: strengthExercise === "custom" ? (customExercise.trim() || te.custom) : strengthExercise, sets: parseFloat(exerciseSets) || 0, reps: parseFloat(exerciseReps) || 0, weight_kg: parseFloat(exerciseWeight) || 0 }
    try {
      const res = await logExercise({ type: exerciseType, detail, date: todayStr() })
      setShowExerciseModal(false)
      setExerciseDuration(""); setExerciseSets(""); setExerciseReps(""); setExerciseWeight("")
      // 运动 tab 依赖 dailySummary 显示消耗，无论当前 food sub-tab 是哪个都要刷新
      const [, fresh] = await Promise.all([loadData(), getDailySummary(todayStr())])
      setDailySummary(fresh)
      Alert.alert("", `${te.successMsg} ${Math.round(res.calories_burned)} ${te.kcal}`)
    } catch {
      Alert.alert(i18n.common.error)
    }
  }

  async function handlePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert(t.needCameraPermission); return }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
    if (result.canceled || !result.assets?.length) return
    setAnalyzing(true)
    setShowAddModal(false)
    try {
      for (const asset of result.assets) {
        if (asset.base64) {
          await addFoodLogFromPhoto(mealType, asset.base64, todayStr(), language)
        }
      }
    } catch {
      Alert.alert(i18n.common.error, t.analyzeFail)
    } finally {
      setAnalyzing(false)
      await loadData()
    }
  }

  const mealLabel = (type: string) =>
    type === "breakfast" ? t.breakfast : type === "lunch" ? t.lunch : type === "dinner" ? t.dinner : t.snack

  return (
    <View style={styles.container}>
      {/* 主 tab 切换 */}
      <View style={styles.tabRow}>
        {([["food", t.foodTab], ["exercise", t.exerciseTab], ["ingredients", t.ingredientsTab]] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.tabBtn, mainTab === key && styles.tabBtnActive]}
            onPress={() => setMainTab(key)}>
            <Text style={[styles.tabText, mainTab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 饮食/统计子 tab（仅在 food tab 下显示） */}
      {mainTab === "food" && (
        <View style={[styles.tabRow, { borderTopWidth: 0 }]}>
          {(["daily", "weekly", "monthly"] as const).map((key) => (
            <TouchableOpacity key={key} style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
              onPress={() => setTab(key)}>
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>
                {key === "daily" ? t.daily : key === "weekly" ? t.weekly : t.monthly}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {(mainTab === "food" || mainTab === "exercise") && (
        loading ? (
          <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
        ) : (
          <ScrollView contentContainerStyle={styles.content}>

            {/* 今日视图 */}
            {mainTab === "food" && tab === "daily" && dailySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>{t.todayNutrition}</Text>
                <Text style={styles.statLine}>{t.totalCalories}：<Text style={styles.bold}>{Math.round(dailySummary.total_calories)}</Text> / {Math.round(dailySummary.target_calories ?? 2000)} kcal</Text>
                <ProgressBar value={dailySummary.total_calories} target={dailySummary.target_calories || 2000} />
                <Text style={styles.statLine}>{t.totalProtein}：<Text style={styles.bold}>{Math.round(dailySummary.total_protein)}g</Text> / {Math.round(dailySummary.target_protein ?? 100)}g</Text>
                <ProgressBar value={dailySummary.total_protein} target={dailySummary.target_protein || 100} color="#3b82f6" />
                <Text style={styles.statLine}>{t.totalFiber}：<Text style={styles.bold}>{Math.round(dailySummary.total_fiber)}g</Text> / 30g</Text>
                <ProgressBar value={dailySummary.total_fiber} target={30} color="#f59e0b" />
                <Text style={styles.statLine}>{t.antiInflammatory}：<Text style={styles.bold}>{dailySummary.anti_inflammatory_score.toFixed(1)}/10</Text></Text>
                <Text style={styles.statLine}>{t.exerciseBurned}：<Text style={styles.bold}>{Math.round(dailySummary.exercise_calories_burned)} kcal</Text></Text>
              </View>
              {dailySummary.logs.length === 0 ? (
                <Text style={styles.empty}>{t.noLogs}</Text>
              ) : (
                (() => {
                  // 按餐次分组
                  const groups: Record<string, typeof dailySummary.logs> = {}
                  const order = ["breakfast", "lunch", "dinner", "snack"]
                  dailySummary.logs.forEach(log => {
                    if (!groups[log.meal_type]) groups[log.meal_type] = []
                    groups[log.meal_type].push(log)
                  })
                  return order.filter(k => groups[k]).map(mealType => {
                    const logs = groups[mealType]
                    const mealTotalCal = logs.reduce((s, l) => s + l.total_calories, 0)
                    const mealTotalPro = logs.reduce((s, l) => s + l.total_protein, 0)
                    return (
                      <View key={mealType} style={styles.mealGroup}>
                        <View style={styles.mealGroupHeader}>
                          <Text style={styles.mealLabel}>{mealLabel(mealType)}</Text>
                          <Text style={styles.mealGroupTotal}>{mealTotalCal.toFixed(0)} kcal</Text>
                        </View>
                        {logs.map(log => (
                          <View key={log.id} style={styles.logCard}>
                            <View style={{ flex: 1 }}>
                              {log.food_items.map((item, i) => (
                                <Text key={i} style={styles.foodItem}>{item.name} — {item.calories}kcal · {t.totalProtein}: {item.protein}g</Text>
                              ))}
                            </View>
                            <TouchableOpacity onPress={() => handleDeleteFoodLog(log.id)} style={{ paddingLeft: 12, paddingVertical: 8, paddingRight: 4 }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                              <Text style={{ fontSize: 20, color: "#ef4444", fontWeight: "bold" }}>×</Text>
                            </TouchableOpacity>
                          </View>
                        ))}
                        <Text style={styles.logTotal}>{t.subtotal}：{mealTotalCal.toFixed(0)}kcal · {mealTotalPro.toFixed(1)}g {t.totalProtein}</Text>
                      </View>
                    )
                  })
                })()
              )}
            </View>
          )}

            {/* 周视图 */}
            {mainTab === "food" && tab === "weekly" && weeklySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>{t.weeklyTrend} ({weeklySummary.week_start} ~ {weeklySummary.week_end})</Text>
                <Text style={styles.statLine}>{t.avgProtein}：<Text style={styles.bold}>{Math.round(weeklySummary.avg_protein)}g/{i18n.common.perDay}</Text></Text>
                <Text style={styles.statLine}>{t.avgFiber}：<Text style={styles.bold}>{Math.round(weeklySummary.avg_fiber)}g/{i18n.common.perDay}</Text></Text>
                <Text style={styles.statLine}>{t.avgAnti}：<Text style={styles.bold}>{weeklySummary.avg_anti_inflammatory.toFixed(1)}/10</Text></Text>
                <Text style={styles.statLine}>{t.totalExercise}：<Text style={styles.bold}>{Math.round(weeklySummary.total_exercise_calories)} kcal</Text></Text>
              </View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>{t.dailyCalories}</Text>
                {weeklySummary.daily_calories.map((d) => (
                  <View key={d.date} style={{ marginBottom: 8 }}>
                    <View style={styles.dayRow}>
                      <Text style={styles.dayLabel}>{d.date.slice(8)}</Text>
                      <View style={{ flex: 1, marginHorizontal: 8 }}>
                        <ProgressBar value={d.calories} target={2000} />
                      </View>
                      <Text style={styles.dayValue}>{d.calories.toFixed(0)}</Text>
                    </View>
                    {d.exercise > 0 && (
                      <View style={{ flexDirection: "row", alignItems: "center", paddingLeft: 40 }}>
                        <Text style={{ fontSize: 11, color: "#3b82f6" }}>🏃 -{d.exercise.toFixed(0)} kcal</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

            {/* 月视图 */}
            {mainTab === "food" && tab === "monthly" && monthlySummary && (
            <View>
              <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>{monthlySummary.month} {t.monthOverview}</Text>
                <Text style={styles.statLine}>{t.daysLogged}：<Text style={styles.bold}>{monthlySummary.total_days_logged}{i18n.common.perDay}</Text></Text>
                <Text style={styles.statLine}>{t.avgAnti}：<Text style={styles.bold}>{monthlySummary.avg_anti_inflammatory.toFixed(1)}/10</Text></Text>
              </View>
              {monthlySummary.body_metrics.length > 0 && (
                <View style={styles.statsCard}>
                  <Text style={styles.cardTitle}>{t.bodyChange}</Text>
                  {monthlySummary.body_metrics.map((m) => (
                    <Text key={m.id} style={styles.statLine}>{m.date}：{m.weight != null ? Math.round(m.weight) : "-"}kg · {t.bodyFat} {m.body_fat_pct != null ? m.body_fat_pct.toFixed(1) : "-"}%</Text>
                  ))}
                </View>
              )}
            </View>
          )}

            {/* 运动 tab 内容 */}
            {mainTab === "exercise" && (
              <View>
                {/* 运动概览卡片 */}
                <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: "#1a1a1a", marginBottom: 12 }}>{t.todayExercise}</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#f0fdf4", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 28 }}>🏃</Text>
                    </View>
                    <View>
                      <Text style={{ fontSize: 28, fontWeight: "bold", color: "#16a34a" }}>
                        {Math.round(dailySummary?.exercise_calories_burned ?? 0)}
                      </Text>
                      <Text style={{ fontSize: 13, color: "#6b7280" }}>{t.kcalBurned}</Text>
                    </View>
                  </View>
                </View>
                {/* 引导添加运动 */}
                <TouchableOpacity
                  style={{ backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center" }}
                  onPress={() => setShowExerciseModal(true)}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>＋ {t.logExercise}</Text>
                </TouchableOpacity>
              </View>
            )}

        </ScrollView>
        )
      )}

      {/* 食材清单 tab */}
      {mainTab === "ingredients" && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={{ padding: 0 }}>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={t.ingredientName}
                value={ingName}
                onChangeText={setIngName}
              />
              <TextInput
                style={{ borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: "#fff", width: 70 }}
                placeholder={t.quantity}
                value={ingQty}
                onChangeText={setIngQty}
                keyboardType="numeric"
              />
              <TouchableOpacity
                style={{ backgroundColor: "#16a34a", borderRadius: 12, paddingHorizontal: 14, justifyContent: "center", alignItems: "center" }}
                onPress={handleAddIngredient}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>{t.add}</Text>
              </TouchableOpacity>
            </View>
            {ingredients.map(item => (
              <View key={item.id} style={{ backgroundColor: "#fff", borderRadius: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", padding: 14, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 }}>
                <Text style={{ flex: 1, fontSize: 15, color: "#1a1a1a" }}>{item.name}</Text>
                <Text style={{ fontSize: 13, color: "#6b7280", marginRight: 12 }}>{item.quantity}{item.unit}</Text>
                <TouchableOpacity onPress={() => handleDeleteIngredient(item.id)}>
                  <Text style={{ color: "#ef4444", fontSize: 18 }}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
            {ingredients.length === 0 && (
              <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, paddingVertical: 20 }}>{t.noIngredients}</Text>
            )}
          </View>
        </ScrollView>
      )}

      {analyzing && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.overlayText}>{t.analyzing}</Text>
        </View>
      )}

      {/* 浮动按钮组（仅饮食/运动 tab 的今日视图） */}
      {mainTab === "food" && tab === "daily" && (
        <View style={styles.fabGroup}>
          <TouchableOpacity style={[styles.fab, { backgroundColor: "#3b82f6", marginBottom: 12 }]} onPress={() => setShowExerciseModal(true)}>
            <Text style={styles.fabText}>🏃</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 运动记录弹窗 */}
      <Modal visible={showExerciseModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalBox} contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{te.title}</Text>
              <View style={styles.mealTypeRow}>
                {(["cardio", "strength"] as const).map(type => (
                  <TouchableOpacity key={type}
                    style={[styles.mealTypeBtn, exerciseType === type && styles.mealTypeBtnActive]}
                    onPress={() => setExerciseType(type)}>
                    <Text style={[styles.mealTypeTxt, exerciseType === type && styles.mealTypeTxtActive]}>
                      {type === "cardio" ? te.cardio : te.strength}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {exerciseType === "cardio" ? (
                <>
                  <Text style={styles.label}>{te.activity}</Text>
                  <View style={styles.mealTypeRow}>
                    {(["walking", "running", "cycling", "swimming"] as const).map(a => (
                      <TouchableOpacity key={a}
                        style={[styles.mealTypeBtn, exerciseActivity === a && styles.mealTypeBtnActive]}
                        onPress={() => setExerciseActivity(a)}>
                        <Text style={[styles.mealTypeTxt, exerciseActivity === a && styles.mealTypeTxtActive]} numberOfLines={1} adjustsFontSizeToFit>
                          {te[a]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput style={styles.input} placeholder={te.duration} value={exerciseDuration}
                    onChangeText={setExerciseDuration} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  <Text style={styles.label}>{te.intensity}</Text>
                  <View style={styles.mealTypeRow}>
                    {(["low", "moderate", "high"] as const).map(i => (
                      <TouchableOpacity key={i}
                        style={[styles.mealTypeBtn, exerciseIntensity === i && styles.mealTypeBtnActive]}
                        onPress={() => setExerciseIntensity(i)}>
                        <Text style={[styles.mealTypeTxt, exerciseIntensity === i && styles.mealTypeTxtActive]} numberOfLines={1} adjustsFontSizeToFit>
                          {te[i]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>{te.activity}</Text>
                  <View style={styles.mealTypeRow}>
                    {(["squat", "bench", "deadlift", "pullup"] as const).map(key => (
                      <TouchableOpacity key={key}
                        style={[styles.mealTypeBtn, strengthExercise === key && styles.mealTypeBtnActive]}
                        onPress={() => setStrengthExercise(key)}>
                        <Text style={[styles.mealTypeTxt, strengthExercise === key && styles.mealTypeTxtActive, { textAlign: "center" }]}>{te[key]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.mealTypeRow}>
                    {(["shoulder", "row", "lunge", "curl", "custom"] as const).map(key => (
                      <TouchableOpacity key={key}
                        style={[styles.mealTypeBtn, strengthExercise === key && styles.mealTypeBtnActive]}
                        onPress={() => setStrengthExercise(key)}>
                        <Text style={[styles.mealTypeTxt, strengthExercise === key && styles.mealTypeTxtActive, { textAlign: "center" }]}>{te[key]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {strengthExercise === "custom" && (
                    <TextInput style={styles.input} placeholder={te.customPlaceholder} value={customExercise}
                      onChangeText={setCustomExercise} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  )}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder={te.sets} value={exerciseSets}
                      onChangeText={setExerciseSets} keyboardType="numeric" returnKeyType="next" />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder={te.reps} value={exerciseReps}
                      onChangeText={setExerciseReps} keyboardType="numeric" returnKeyType="next" />
                    <TextInput style={[styles.input, { flex: 1 }]} placeholder={te.weightKg} value={exerciseWeight}
                      onChangeText={setExerciseWeight} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
                  </View>
                </>
              )}
              <TouchableOpacity style={styles.addBtn} onPress={handleLogExercise}>
                <Text style={styles.addBtnText}>{te.log}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#9ca3af", marginTop: 8 }]}
                onPress={() => {
                  Keyboard.dismiss()
                  setShowExerciseModal(false)
                  setExerciseDuration(""); setExerciseSets(""); setExerciseReps(""); setExerciseWeight("")
                  setCustomExercise(""); setExerciseType("cardio"); setExerciseActivity("walking")
                  setStrengthExercise("squat"); setExerciseIntensity("moderate")
                }}>
                <Text style={styles.addBtnText}>{i18n.common.cancel}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 添加饮食弹窗 */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <View style={styles.modalOverlay}>
            <ScrollView style={styles.modalBox} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>{t.addMeal}</Text>
              <Text style={styles.label}>{t.mealType}</Text>
              <View style={styles.mealTypeRow}>
                {["breakfast", "lunch", "dinner", "snack"].map((type) => (
                  <TouchableOpacity key={type}
                    style={[styles.mealTypeBtn, mealType === type && styles.mealTypeBtnActive]}
                    onPress={() => setMealType(type)}>
                    <Text style={[styles.mealTypeTxt, mealType === type && styles.mealTypeTxtActive]} numberOfLines={1} adjustsFontSizeToFit>
                      {mealLabel(type)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>{t.foodName}</Text>
              <TextInput style={styles.input} placeholder={t.foodName} value={foodName} onChangeText={setFoodName} returnKeyType="next" />
              <Text style={styles.label}>{t.quantity}</Text>
              <TextInput
                style={[styles.input, { marginBottom: 8 }]}
                placeholder={t.quantity}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                returnKeyType="next"
              />
              <SegmentedControl
                options={[
                  { label: "g", value: "g" },
                  { label: "ml", value: "ml" },
                  { label: i18n.ingredients.units.piece, value: "个" },
                  { label: i18n.ingredients.units.slice, value: "片" },
                ]}
                value={unit}
                onChange={setUnit}
              />
              <TouchableOpacity
                style={[styles.addBtn, { backgroundColor: "#8b5cf6", marginBottom: 12 }, estimating && { backgroundColor: "#c4b5fd" }]}
                onPress={handleAIEstimate}
                disabled={estimating}
              >
                {estimating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.addBtnText}>{t.aiEstimate}</Text>
                }
              </TouchableOpacity>
              <Text style={styles.label}>{t.calories}</Text>
              <TextInput style={styles.input} placeholder={t.calories} value={calories} onChangeText={setCalories} keyboardType="numeric" returnKeyType="next" />
              <Text style={styles.label}>{t.protein}</Text>
              <TextInput style={styles.input} placeholder={t.protein} value={protein} onChangeText={setProtein} keyboardType="numeric" returnKeyType="next" />
              <Text style={styles.label}>{t.fiber}</Text>
              <TextInput style={styles.input} placeholder={t.fiber} value={fiber} onChangeText={setFiber} keyboardType="numeric" returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
              <TouchableOpacity style={[styles.addBtn, { marginTop: 8 }]} onPress={handleAddManual}>
                <Text style={styles.addBtnText}>{t.addManual}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#3b82f6", marginTop: 8 }]} onPress={handlePhoto}>
                <Text style={styles.addBtnText}>{t.addPhoto}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { backgroundColor: "#9ca3af", marginTop: 8 }]}
                onPress={() => {
                  Keyboard.dismiss()
                  setShowAddModal(false)
                  setFoodName(""); setQuantity("100"); setUnit("g")
                  setCalories(""); setProtein(""); setFiber("")
                }}>
                <Text style={styles.addBtnText}>{i18n.common.cancel}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f7f2" },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e8f0e8" },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#16a34a" },
  tabText: { fontSize: 14, color: "#9ca3af" },
  tabTextActive: { color: "#16a34a", fontWeight: "600" },
  content: { padding: 16, paddingBottom: 80 },
  statsCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardTitle: { fontSize: 17, fontWeight: "600", marginBottom: 12, color: "#1a1a1a" },
  statLine: { fontSize: 15, color: "#1a1a1a", marginBottom: 6 },
  bold: { fontWeight: "700" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 15 },
  logCard: { backgroundColor: "#f2f7f2", borderRadius: 12, padding: 14, marginBottom: 4, flexDirection: "row", alignItems: "flex-start" },
  mealGroup: { marginBottom: 14 },
  mealGroupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  mealGroupTotal: { fontSize: 15, fontWeight: "700", color: "#16a34a" },
  mealLabel: { fontSize: 14, color: "#16a34a", fontWeight: "600", marginBottom: 6 },
  foodItem: { fontSize: 14, color: "#1a1a1a", marginBottom: 2 },
  logTotal: { fontSize: 13, color: "#6b7280", marginTop: 6, fontStyle: "italic" },
  dayRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dayLabel: { width: 48, fontSize: 13, color: "#6b7280" },
  dayValue: { width: 48, fontSize: 13, color: "#1a1a1a", textAlign: "right" },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  overlayText: { color: "#fff", marginTop: 12, fontSize: 15 },
  fab: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#16a34a", justifyContent: "center", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 6 },
  fabGroup: { position: "absolute", bottom: 24, right: 24, alignItems: "center" },
  fabText: { color: "#fff", fontSize: 28, lineHeight: 32 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: "700", marginBottom: 20, color: "#1a1a1a" },
  label: { fontSize: 13, color: "#6b7280", marginBottom: 8 },
  mealTypeRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  mealTypeBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#e8f0e8", alignItems: "center", minWidth: 80 },
  mealTypeBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  mealTypeTxt: { fontSize: 13, color: "#1a1a1a" },
  mealTypeTxtActive: { color: "#fff", fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 15, backgroundColor: "#fff" },
  addBtn: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center" },
  addBtnText: { color: "#fff", fontSize: 17, fontWeight: "600" },
})
