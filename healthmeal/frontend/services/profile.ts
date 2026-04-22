import { api } from "./api"

export interface ProfileData {
  height?: number
  weight?: number
  body_fat_pct?: number
  age?: number
  gender?: string
  goal?: string
  activity_level?: string
  allergies?: string[]
  tdee?: number
}

export async function getProfile(): Promise<ProfileData | null> {
  const res = await api.get("/profile")
  return res.data
}

export async function updateProfile(data: ProfileData): Promise<ProfileData> {
  const res = await api.put("/profile", data)
  return res.data
}
