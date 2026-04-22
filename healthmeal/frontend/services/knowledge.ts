import { api } from "./api"

export interface HealthContentData {
  id: number
  type: string
  title: string
  url: string
  source: string
  lang: string
  summary_zh: string | null
  summary_en: string | null
  tags: string[]
  published_at: string | null
  created_at: string
  is_bookmarked: boolean
}

export interface GeneratedMealFromContent {
  meal_plan: Record<string, unknown>
  based_on: string
}

export async function getHealthContent(type?: string, lang?: string): Promise<HealthContentData[]> {
  const params = new URLSearchParams()
  if (type) params.append("type", type)
  if (lang) params.append("lang", lang)
  const query = params.toString() ? `?${params.toString()}` : ""
  const res = await api.get(`/health-content${query}`)
  return res.data
}

export async function getBookmarks(): Promise<HealthContentData[]> {
  const res = await api.get("/health-content/bookmarks")
  return res.data
}

export async function addBookmark(contentId: number): Promise<void> {
  await api.post(`/health-content/${contentId}/bookmark`)
}

export async function removeBookmark(contentId: number): Promise<void> {
  await api.delete(`/health-content/${contentId}/bookmark`)
}

export async function createNote(data: { title: string; content: string; lang: string; tags: string[] }): Promise<HealthContentData> {
  const res = await api.post("/notes", data)
  return res.data
}

export async function deleteNote(id: number): Promise<void> {
  await api.delete(`/notes/${id}`)
}

export async function generateMealFromContent(contentId: number): Promise<GeneratedMealFromContent> {
  const res = await api.post(`/health-content/${contentId}/generate-meal-plan`)
  return res.data
}
