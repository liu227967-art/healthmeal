import { api } from "./api"

export async function loginApi(email: string, password: string) {
  const res = await api.post("/auth/login", { email, password })
  return res.data as { access_token: string; role: string; language: string }
}

export async function registerApi(email: string, password: string, language: string) {
  const res = await api.post("/auth/register", { email, password, language })
  return res.data as { access_token: string; role: string; language: string }
}
