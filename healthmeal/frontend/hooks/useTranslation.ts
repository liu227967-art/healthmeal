import { useAuthStore } from "../store/authStore"
import { zh } from "../i18n/zh"
import { en } from "../i18n/en"

export function useTranslation() {
  const { language, setLanguage } = useAuthStore()
  const t = language === "en" ? en : zh
  return { t, language, setLanguage }
}
