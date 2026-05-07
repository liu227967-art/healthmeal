import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, TextInput, Platform
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Picker } from "@react-native-picker/picker"
import { generateMealPlan, identifyIngredientsFromPhoto, getIngredients, MealPlanData, MealItem } from "../../services/meal"
import { useTranslation } from "../../hooks/useTranslation"
import {
  getHealthContent, getBookmarks, addBookmark, removeBookmark, HealthContentData
} from "../../services/knowledge"
import { generateShoppingList, getShoppingLists, ShoppingListData } from "../../services/social"

function MealCard({ label, meal }: { label: string; meal: MealItem }) {
  const { t: i18n } = useTranslation()
  const t = i18n.meal
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardName}>{meal.name}</Text>
      <View style={styles.statsRow}>
        <Text style={styles.stat}>{meal.calories} kcal</Text>
        <Text style={styles.stat}>{t.protein}: {meal.protein}g</Text>
        <Text style={styles.stat}>{t.fiber}: {meal.fiber}g</Text>
      </View>
      {meal.organs?.length > 0 && (
        <Text style={styles.organs}>{t.organs}：{meal.organs.join("、")}</Text>
      )}
      {meal.ingredients?.length > 0 && (
        <Text style={styles.ingredientsList}>{meal.ingredients.join(" · ")}</Text>
      )}
      {meal.steps?.length > 0 && (
        <View style={styles.steps}>
          <Text style={styles.stepsLabel}>{t.steps}</Text>
          {meal.steps.map((step, i) => (
            <Text key={i} style={styles.step}>{i + 1}. {step}</Text>
          ))}
        </View>
      )}
    </View>
  )
}

function IngredientTag({ name, onRemove }: { name: string; onRemove: () => void }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{name}</Text>
      <TouchableOpacity onPress={onRemove} style={styles.tagRemove}>
        <Text style={styles.tagRemoveText}>×</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function MealScreen() {
  const { t: i18n, language } = useTranslation()
  const t = i18n.meal
  const [style, setStyle] = useState("chinese")
  const [range, setRange] = useState("daily")
  const [plan, setPlan] = useState<MealPlanData | null>(null)
  const [generating, setGenerating] = useState(false)
  const [inputText, setInputText] = useState("")
  const [ingredients, setIngredients] = useState<string[]>([])
  const [savedIngredients, setSavedIngredients] = useState<string[]>([])
  const [recognizing, setRecognizing] = useState(false)
  const [baseDate, setBaseDate] = useState(new Date())
  const [discoverTab, setDiscoverTab] = useState<"ai" | "articles" | "shopping">("ai")
  const [articles, setArticles] = useState<HealthContentData[]>([])
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
  const [shoppingLists, setShoppingLists] = useState<ShoppingListData[]>([])
  const [generatingShopping, setGeneratingShopping] = useState(false)
  const [articlesLoading, setArticlesLoading] = useState(false)

  // 自动从今日食材读取
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    getIngredients(today).then((data) => {
      const names = data.map(i => `${i.name} ${i.quantity}${i.unit}`)
      setSavedIngredients(names)
    }).catch(() => {})
  }, [])

  // 根据 range 显示当前选中的日期描述
  function getDateLabel() {
    const d = new Date(baseDate)
    if (range === "daily") {
      return language === "zh"
        ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
        : `${d.toLocaleString("en", { month: "short" })} ${d.getDate()}, ${d.getFullYear()}`
    } else if (range === "weekly") {
      const day = d.getDay()
      const mon = new Date(d); mon.setDate(d.getDate() - ((day + 6) % 7))
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return `${mon.getMonth() + 1}/${mon.getDate()} — ${sun.getMonth() + 1}/${sun.getDate()}`
    } else {
      return t.monthLabel
        .replace("{year}", String(d.getFullYear()))
        .replace("{month}", String(d.getMonth() + 1))
    }
  }

  function shiftDate(dir: 1 | -1) {
    const d = new Date(baseDate)
    if (range === "daily") d.setDate(d.getDate() + dir)
    else if (range === "weekly") d.setDate(d.getDate() + dir * 7)
    else d.setMonth(d.getMonth() + dir)
    setBaseDate(d)
  }

  function getDateParam() {
    return baseDate.toISOString().split("T")[0]
  }

  function handleAddIngredient() {
    const trimmed = inputText.trim()
    if (!trimmed) return
    const items = trimmed.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
    const newList = [...ingredients]
    items.forEach(item => {
      if (!newList.includes(item)) newList.push(item)
    })
    setIngredients(newList)
    setInputText("")
  }

  function handleRemoveIngredient(name: string) {
    setIngredients(prev => prev.filter(i => i !== name))
  }

  async function handlePhotoRecognize() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { Alert.alert(i18n.common.error, t.needCameraPermission); return }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
    if (result.canceled || !result.assets?.[0]?.base64) return
    setRecognizing(true)
    try {
      const identified = await identifyIngredientsFromPhoto(result.assets[0].base64)
      const newList = [...ingredients]
      identified.forEach((item: { name: string }) => {
        if (!newList.includes(item.name)) newList.push(item.name)
      })
      setIngredients(newList)
    } catch {
      Alert.alert(i18n.common.error, t.recognizeFail)
    } finally {
      setRecognizing(false)
    }
  }

  async function handleGenerate() {
    setGenerating(true)
    setPlan(null)
    try {
      const allIngredients = [...savedIngredients, ...ingredients]
      const result = await generateMealPlan(style, range, allIngredients.length > 0 ? allIngredients : undefined, getDateParam(), language)
      setPlan(result)
    } catch {
      Alert.alert(i18n.common.error, t.generateFail)
    } finally {
      setGenerating(false)
    }
  }

  const loadArticles = useCallback(async () => {
    setArticlesLoading(true)
    try {
      const data = await getHealthContent()
      setArticles(data)
      const bms = await getBookmarks()
      setBookmarkedIds(bms.map(b => b.id))
    } catch {
      Alert.alert(i18n.common.error)
    } finally { setArticlesLoading(false) }
  }, [])

  const loadShopping = useCallback(async () => {
    try { setShoppingLists(await getShoppingLists()) } catch {}
  }, [])

  useEffect(() => {
    if (discoverTab === "articles") loadArticles()
    if (discoverTab === "shopping") loadShopping()
  }, [discoverTab, loadArticles, loadShopping])

  async function handleToggleBookmark(id: number, isBookmarked: boolean) {
    // 乐观更新
    setBookmarkedIds(prev => isBookmarked ? prev.filter(b => b !== id) : [...prev, id])
    try {
      if (isBookmarked) {
        await removeBookmark(id)
      } else {
        await addBookmark(id)
      }
    } catch {
      // 回滚乐观更新
      setBookmarkedIds(prev => isBookmarked ? [...prev, id] : prev.filter(b => b !== id))
      Alert.alert(i18n.common.error)
    }
  }

  async function handleGenerateShopping() {
    setGeneratingShopping(true)
    try {
      const result = await generateShoppingList(language)
      await loadShopping()
      if (!result.items || result.items.length === 0) {
        Alert.alert("", i18n.social.noMealPlan)
      }
    }
    catch { Alert.alert(i18n.common.error) }
    finally { setGeneratingShopping(false) }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}>
      <View style={styles.discoverTabRow}>
        {([["ai", t.aiTab], ["articles", t.articlesTab], ["shopping", t.shoppingTab]] as const).map(([key, label]) => (
          <TouchableOpacity key={key}
            style={[styles.discoverTab, discoverTab === key && styles.discoverTabActive]}
            onPress={() => setDiscoverTab(key)}>
            <Text style={[styles.discoverTabText, discoverTab === key && styles.discoverTabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {discoverTab === "ai" && (
        <View>
      <Text style={styles.title}>{t.title}</Text>

      <Text style={styles.label}>{t.style}</Text>
      <View style={styles.styleGrid}>
        {Object.entries(t.styles).map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.styleBtn, style === key && styles.styleBtnActive]}
            onPress={() => setStyle(key)}
          >
            <Text style={[styles.styleBtnText, style === key && styles.styleBtnTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t.range}</Text>
      <Picker selectedValue={range} onValueChange={(v) => { setRange(v); setBaseDate(new Date()) }}>
        {Object.entries(t.ranges).map(([key, label]) => (
          <Picker.Item key={key} label={label} value={key} />
        ))}
      </Picker>

      {/* 日期导航 */}
      <View style={styles.dateNav}>
        <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDate(-1)}>
          <Text style={styles.dateArrowText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.dateLabel}>{getDateLabel()}</Text>
        <TouchableOpacity style={styles.dateArrow} onPress={() => shiftDate(1)}>
          <Text style={styles.dateArrowText}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 食材区 */}
      {savedIngredients.length > 0 && (
        <View style={styles.savedIngredientsBox}>
          <Text style={styles.label}>{t.todayIngredients}</Text>
          <View style={styles.tagRow}>
            {savedIngredients.map(name => (
              <View key={name} style={styles.tag}>
                <Text style={styles.tagText}>{name}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <Text style={styles.label}>{t.extraIngredients}</Text>
      <Text style={styles.hint}>{t.ingredientHint}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.ingredientInput}
          placeholder={t.ingredientPlaceholder}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleAddIngredient}
          returnKeyType="done"
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAddIngredient}>
          <Text style={styles.addBtnText}>{t.addBtn}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.photoBtn} onPress={handlePhotoRecognize} disabled={recognizing}>
          {recognizing
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.addBtnText}>📷</Text>
          }
        </TouchableOpacity>
      </View>
      {ingredients.length > 0 && (
        <View style={styles.tagRow}>
          {ingredients.map(name => (
            <IngredientTag key={name} name={name} onRemove={() => handleRemoveIngredient(name)} />
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[styles.genButton, generating && styles.genButtonDisabled]}
        onPress={handleGenerate}
        disabled={generating}
      >
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.genButtonText}>{t.generate}</Text>
        }
      </TouchableOpacity>

      {generating && (
        <Text style={styles.generatingText}>{t.generating}</Text>
      )}

      {plan && (
        <View style={styles.result}>
          {plan.content.breakfast && (
            <MealCard label={t.breakfast} meal={plan.content.breakfast} />
          )}
          {plan.content.lunch && (
            <MealCard label={t.lunch} meal={plan.content.lunch} />
          )}
          {plan.content.dinner && (
            <MealCard label={t.dinner} meal={plan.content.dinner} />
          )}

          {plan.content.summary && (
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>{t.dailySummary}</Text>
              <Text style={styles.summaryLine}>{t.totalCalories}：{plan.content.summary.total_calories} kcal</Text>
              <Text style={styles.summaryLine}>{t.protein}：{plan.content.summary.protein}g</Text>
              <Text style={styles.summaryLine}>{t.fiber}：{plan.content.summary.fiber}g</Text>
              <Text style={styles.summaryLine}>{t.antiInflammatory}：{plan.content.summary.anti_inflammatory_score}/10</Text>
              <Text style={styles.summaryNotes}>{plan.content.summary.health_notes}</Text>
            </View>
          )}
        </View>
      )}
        </View>
      )}

      {discoverTab === "articles" && (
        <View style={{ padding: 16 }}>
          {articlesLoading ? (
            <ActivityIndicator color="#16a34a" style={{ marginTop: 40 }} />
          ) : articles.length === 0 ? (
            <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, paddingVertical: 40 }}>{t.noArticles}</Text>
          ) : (
            articles.map(item => (
              <View key={item.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a", marginBottom: 4 }}>
                      {item.title}
                    </Text>
                    <Text style={{ fontSize: 13, color: "#6b7280" }} numberOfLines={2}>
                      {item.summary_zh || item.summary_en || ""}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleToggleBookmark(item.id, bookmarkedIds.includes(item.id))}>
                    <Text style={{ fontSize: 20 }}>{bookmarkedIds.includes(item.id) ? "🔖" : "📄"}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {discoverTab === "shopping" && (
        <View style={{ padding: 16 }}>
          <TouchableOpacity
            style={[styles.genButton, generatingShopping && styles.genButtonDisabled]}
            onPress={handleGenerateShopping}
            disabled={generatingShopping}>
            {generatingShopping
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.genButtonText}>{t.generateShoppingBtn}</Text>}
          </TouchableOpacity>
          {shoppingLists.map(list => (
            <View key={list.id} style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a", marginBottom: 8 }}>{list.date}</Text>
              {list.items?.map((item, i) => (
                <Text key={i} style={{ fontSize: 13, color: "#6b7280", paddingVertical: 3 }}>
                  • {item.name} {item.quantity}{item.unit}
                </Text>
              ))}
            </View>
          ))}
          {shoppingLists.length === 0 && (
            <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, paddingVertical: 20 }}>{t.noShopping}</Text>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  label: { fontSize: 14, color: "#666", marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 12, color: "#9ca3af", marginBottom: 8 },
  inputRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  ingredientInput: { flex: 1, borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 12, padding: 10, fontSize: 14 },
  addBtn: { backgroundColor: "#16a34a", borderRadius: 14, paddingHorizontal: 14, justifyContent: "center" },
  photoBtn: { backgroundColor: "#3b82f6", borderRadius: 14, paddingHorizontal: 14, justifyContent: "center" },
  addBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  dateNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#f2f7f2", borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginBottom: 8 },
  dateArrow: { padding: 6 },
  dateArrowText: { fontSize: 24, color: "#16a34a", fontWeight: "bold" },
  dateLabel: { fontSize: 15, fontWeight: "600", color: "#1a1a1a" },
  savedIngredientsBox: { marginBottom: 8 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  tag: { flexDirection: "row", alignItems: "center", backgroundColor: "#f0fdf4", borderRadius: 16, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: "#86efac" },
  tagText: { fontSize: 13, color: "#166534", marginRight: 4 },
  tagRemove: { paddingLeft: 2 },
  tagRemoveText: { fontSize: 16, color: "#6b7280", lineHeight: 18 },
  styleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  styleBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: "#e8f0e8", backgroundColor: "#f2f7f2" },
  styleBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  styleBtnText: { fontSize: 13, color: "#1a1a1a" },
  styleBtnTextActive: { color: "#fff", fontWeight: "600" },
  genButtonDisabled: { backgroundColor: "#86efac" },
  genButton: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center", marginVertical: 12 },
  genButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  generatingText: { textAlign: "center", color: "#6b7280", fontSize: 14, marginBottom: 16 },
  result: { marginTop: 16 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  cardLabel: { fontSize: 12, color: "#16a34a", fontWeight: "600", marginBottom: 4 },
  cardName: { fontSize: 18, fontWeight: "bold", color: "#1a1a1a", marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  stat: { fontSize: 13, color: "#6b7280" },
  organs: { fontSize: 13, color: "#7c3aed", marginBottom: 6 },
  ingredientsList: { fontSize: 12, color: "#6b7280", marginBottom: 8 },
  steps: { marginTop: 4 },
  stepsLabel: { fontSize: 13, fontWeight: "600", color: "#1a1a1a", marginBottom: 4 },
  step: { fontSize: 13, color: "#6b7280", lineHeight: 20 },
  summary: { backgroundColor: "#f0fdf4", borderRadius: 16, padding: 20, marginTop: 8 },
  summaryTitle: { fontSize: 16, fontWeight: "bold", color: "#166534", marginBottom: 8 },
  summaryLine: { fontSize: 14, color: "#166534", marginBottom: 4 },
  summaryNotes: { fontSize: 14, color: "#166534", marginTop: 8, fontStyle: "italic" },
  discoverTabRow: { flexDirection: "row" as const, backgroundColor: "#f2f7f2", borderRadius: 12, padding: 4, margin: 16, marginBottom: 0 },
  discoverTab: { flex: 1, paddingVertical: 8, alignItems: "center" as const, borderRadius: 10 },
  discoverTabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  discoverTabText: { fontSize: 13, color: "#6b7280" },
  discoverTabTextActive: { color: "#16a34a", fontWeight: "600" as const },
})
