import { useState } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import { generateMealPlan, MealPlanData, MealItem } from "../../services/meal"
import { zh } from "../../i18n/zh"

const t = zh.meal

function MealCard({ label, meal }: { label: string; meal: MealItem }) {
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

export default function MealScreen() {
  const [style, setStyle] = useState("chinese")
  const [range, setRange] = useState("daily")
  const [plan, setPlan] = useState<MealPlanData | null>(null)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    setPlan(null)
    try {
      const result = await generateMealPlan(style, range)
      setPlan(result)
    } catch {
      Alert.alert(zh.common.error, "生成失败，请检查网络或稍后重试")
    } finally {
      setGenerating(false)
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.title}</Text>

      <Text style={styles.label}>{t.style}</Text>
      <Picker selectedValue={style} onValueChange={setStyle}>
        {Object.entries(t.styles).map(([key, label]) => (
          <Picker.Item key={key} label={label} value={key} />
        ))}
      </Picker>

      <Text style={styles.label}>{t.range}</Text>
      <Picker selectedValue={range} onValueChange={setRange}>
        {Object.entries(t.ranges).map(([key, label]) => (
          <Picker.Item key={key} label={label} value={key} />
        ))}
      </Picker>

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
              <Text style={styles.summaryTitle}>每日汇总</Text>
              <Text style={styles.summaryLine}>{t.totalCalories}：{plan.content.summary.total_calories} kcal</Text>
              <Text style={styles.summaryLine}>{t.protein}：{plan.content.summary.protein}g</Text>
              <Text style={styles.summaryLine}>{t.fiber}：{plan.content.summary.fiber}g</Text>
              <Text style={styles.summaryLine}>{t.antiInflammatory}：{plan.content.summary.anti_inflammatory_score}/10</Text>
              <Text style={styles.summaryNotes}>{plan.content.summary.health_notes}</Text>
            </View>
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
  genButton: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16, marginBottom: 8 },
  genButtonDisabled: { backgroundColor: "#86efac" },
  genButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  generatingText: { textAlign: "center", color: "#666", fontSize: 14, marginBottom: 16 },
  result: { marginTop: 16 },
  card: { backgroundColor: "#f9fafb", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardLabel: { fontSize: 12, color: "#22c55e", fontWeight: "600", marginBottom: 4 },
  cardName: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  stat: { fontSize: 13, color: "#555" },
  organs: { fontSize: 13, color: "#7c3aed", marginBottom: 6 },
  ingredientsList: { fontSize: 12, color: "#888", marginBottom: 8 },
  steps: { marginTop: 4 },
  stepsLabel: { fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 4 },
  step: { fontSize: 13, color: "#555", lineHeight: 20 },
  summary: { backgroundColor: "#f0fdf4", borderRadius: 12, padding: 16, marginTop: 8 },
  summaryTitle: { fontSize: 16, fontWeight: "bold", color: "#166534", marginBottom: 8 },
  summaryLine: { fontSize: 14, color: "#166534", marginBottom: 4 },
  summaryNotes: { fontSize: 14, color: "#166534", marginTop: 8, fontStyle: "italic" },
})
