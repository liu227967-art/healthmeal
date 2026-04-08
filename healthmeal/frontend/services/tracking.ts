import { api } from "./api"

export interface FoodItem {
  name: string
  calories: number
  protein: number
  fiber: number
  anti_inflammatory: number
}

export interface FoodLogData {
  id: number
  meal_type: string
  input_method: string
  date: string
  food_items: FoodItem[]
  total_calories: number
  total_protein: number
  total_fiber: number
  anti_inflammatory_score: number
  logged_at: string
}

export interface BodyMetricData {
  id: number
  date: string
  weight: number | null
  body_fat_pct: number | null
  recorded_at: string
}

export interface DailySummary {
  date: string
  total_calories: number
  target_calories: number | null
  total_protein: number
  target_protein: number | null
  total_fiber: number
  anti_inflammatory_score: number
  meal_count: number
  exercise_calories_burned: number
  logs: FoodLogData[]
}

export interface WeeklySummary {
  week_start: string
  week_end: string
  daily_calories: Array<{ date: string; calories: number; exercise: number }>
  avg_protein: number
  avg_fiber: number
  avg_anti_inflammatory: number
  total_exercise_calories: number
}

export interface MonthlySummary {
  month: string
  weekly_calories: Array<{ week: string; avg_calories: number }>
  body_metrics: BodyMetricData[]
  avg_anti_inflammatory: number
  total_days_logged: number
}

export async function addFoodLog(data: {
  meal_type: string
  input_method: string
  date: string
  food_items: FoodItem[]
}): Promise<FoodLogData> {
  const res = await api.post("/food-logs", data)
  return res.data
}

export async function addFoodLogFromPhoto(meal_type: string, image_base64: string): Promise<FoodLogData> {
  const res = await api.post("/food-logs/photo", { meal_type, image_base64 })
  return res.data
}

export async function getFoodLogs(date: string): Promise<FoodLogData[]> {
  const res = await api.get(`/food-logs?date=${date}`)
  return res.data
}

export async function recordBodyMetric(data: {
  date: string
  weight?: number
  body_fat_pct?: number
}): Promise<BodyMetricData> {
  const res = await api.post("/body-metrics", data)
  return res.data
}

export async function getBodyMetrics(): Promise<BodyMetricData[]> {
  const res = await api.get("/body-metrics")
  return res.data
}

export async function getDailySummary(date: string): Promise<DailySummary> {
  const res = await api.get(`/health-summary?period=daily&date=${date}`)
  return res.data
}

export async function getWeeklySummary(date: string): Promise<WeeklySummary> {
  const res = await api.get(`/health-summary?period=weekly&date=${date}`)
  return res.data
}

export async function getMonthlySummary(date: string): Promise<MonthlySummary> {
  const res = await api.get(`/health-summary?period=monthly&date=${date}`)
  return res.data
}
