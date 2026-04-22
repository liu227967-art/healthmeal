import { api } from "./api"

export interface IngredientData {
  id: number
  name: string
  quantity: number
  unit: string
  input_method: string
  date: string
  created_at: string
}

export interface MealItem {
  name: string
  calories: number
  protein: number
  fiber: number
  organs: string[]
  steps: string[]
  ingredients: string[]
}

export interface MealSummary {
  total_calories: number
  protein: number
  fiber: number
  anti_inflammatory_score: number
  health_notes: string
}

export interface MealContent {
  breakfast?: MealItem
  lunch?: MealItem
  dinner?: MealItem
  summary?: MealSummary
}

export interface MealPlanData {
  id: number
  style: string
  range: string
  content: MealContent
  total_calories: number | null
  nutrients: Record<string, number | string> | null
  created_at: string
}

export async function addIngredient(data: {
  name: string
  quantity: number
  unit: string
  input_method: string
  date: string
}): Promise<IngredientData> {
  const res = await api.post("/ingredients", data)
  return res.data
}

export async function getIngredients(date: string): Promise<IngredientData[]> {
  const res = await api.get(`/ingredients?date=${date}`)
  return res.data
}

export async function deleteIngredient(id: number): Promise<void> {
  await api.delete(`/ingredients/${id}`)
}

export async function identifyIngredientsFromPhoto(imageBase64: string, lang = "zh"): Promise<IngredientData[]> {
  const res = await api.post("/ingredients/identify-photo", { image_base64: imageBase64, lang })
  return res.data
}

export async function generateMealPlan(style: string, range: string, ingredients?: string[], date?: string, lang = "zh"): Promise<MealPlanData> {
  const res = await api.post("/meal-plans/generate", { style, range, ingredients, date, lang })
  return res.data
}

export async function getMealPlanHistory(): Promise<MealPlanData[]> {
  const res = await api.get("/meal-plans/history")
  return res.data
}
