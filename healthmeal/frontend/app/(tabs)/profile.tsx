import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { useRouter } from "expo-router"
import { getProfile, updateProfile, ProfileData } from "../../services/profile"
import { api } from "../../services/api"
import { useTranslation } from "../../hooks/useTranslation"
import { useAuthStore } from "../../store/authStore"

export default function ProfileScreen() {
  const { t: i18n } = useTranslation()
  const t = i18n.profile
  const { logout } = useAuthStore()
  const router = useRouter()
  const [form, setForm] = useState<ProfileData>({
    height: undefined,
    weight: undefined,
    body_fat_pct: undefined,
    age: undefined,
    gender: "female",
    goal: "reduce_fat",
    allergies: [],
  })
  const [tdee, setTdee] = useState<number | null>(null)

  useEffect(() => {
    getProfile().then((data) => {
      if (data) {
        setForm(data)
        setTdee(data.tdee ?? null)
      }
    })
  }, [])

  async function handleSave() {
    try {
      const updated = await updateProfile(form)
      setTdee(updated.tdee ?? null)
      Alert.alert("", i18n.common.success)
    } catch {
      Alert.alert(i18n.common.error)
    }
  }

  async function handleSyncAppleHealth() {
    if (Platform.OS !== "ios") {
      Alert.alert("提示", "Apple Health 仅在 iOS 设备上可用")
      return
    }
    try {
      const AppleHealthKit = require("react-native-health").default
      const PERMS = require("react-native-health").HealthKitPermissions
      await new Promise<void>((resolve, reject) => {
        AppleHealthKit.initHealthKit(
          { permissions: { read: [PERMS.Steps, PERMS.ActiveEnergyBurned] } },
          (err: any) => { err ? reject(err) : resolve() }
        )
      })
      const today = new Date()
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString()
      const steps: number = await new Promise((resolve, reject) => {
        AppleHealthKit.getStepCount(
          { date: startOfDay },
          (err: any, results: any) => err ? reject(err) : resolve(results?.value || 0)
        )
      })
      const calories = Math.round(steps * 0.04)
      await api.post("/exercise-logs", {
        type: "cardio",
        detail: { activity: "walking", duration_min: Math.round(steps / 100), intensity: "low", steps }
      })
      Alert.alert("同步成功", `今日步数：${steps}步，消耗约 ${calories}kcal`)
    } catch {
      Alert.alert("同步失败", "请确保已授权 Apple Health 权限")
    }
  }

  const numField = (label: string, key: keyof ProfileData) => (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        value={form[key]?.toString() ?? ""}
        onChangeText={(v) => setForm({ ...form, [key]: v ? parseFloat(v) : undefined })}
      />
    </View>
  )

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.title}</Text>
      {numField(t.height, "height")}
      {numField(t.weight, "weight")}
      {numField(t.bodyFat, "body_fat_pct")}
      {numField(t.age, "age")}

      <Text style={styles.label}>{t.gender}</Text>
      <Picker selectedValue={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
        <Picker.Item label={t.genders.female} value="female" />
        <Picker.Item label={t.genders.male} value="male" />
        <Picker.Item label={t.genders.other} value="other" />
      </Picker>

      <Text style={styles.label}>{t.activityLevel}</Text>
      <Picker selectedValue={form.activity_level ?? "light"} onValueChange={(v) => setForm({ ...form, activity_level: v })}>
        <Picker.Item label={t.activityLevels.sedentary} value="sedentary" />
        <Picker.Item label={t.activityLevels.light} value="light" />
        <Picker.Item label={t.activityLevels.moderate} value="moderate" />
        <Picker.Item label={t.activityLevels.active} value="active" />
        <Picker.Item label={t.activityLevels.very_active} value="very_active" />
      </Picker>

      <Text style={styles.label}>{t.goal}</Text>
      <Picker selectedValue={form.goal} onValueChange={(v) => setForm({ ...form, goal: v })}>
        <Picker.Item label={t.goals.reduce_fat} value="reduce_fat" />
        <Picker.Item label={t.goals.maintain} value="maintain" />
        <Picker.Item label={t.goals.gain_muscle} value="gain_muscle" />
      </Picker>

      {tdee && (
        <View style={styles.tdeeBox}>
          <Text style={styles.tdeeLabel}>{t.tdee}</Text>
          <Text style={styles.tdeeValue}>{tdee} kcal/{i18n.common.perDay}</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>{t.save}</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" && (
        <TouchableOpacity style={[styles.button, { backgroundColor: "#ec4899", marginTop: 12 }]}
          onPress={handleSyncAppleHealth}>
          <Text style={styles.buttonText}>{i18n.common.syncAppleHealth}</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[styles.button, { backgroundColor: "#ef4444", marginTop: 12 }]}
        onPress={() => Alert.alert(i18n.common.logout, i18n.common.logoutConfirm, [
          { text: i18n.common.cancel, style: "cancel" },
          { text: i18n.common.logout, style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login") } }
        ])}
      >
        <Text style={styles.buttonText}>{i18n.common.logout}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f7f2" },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1a1a1a", marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 12, padding: 10, fontSize: 16, backgroundColor: "#fff" },
  button: { backgroundColor: "#16a34a", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tdeeBox: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginTop: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  tdeeLabel: { fontSize: 14, color: "#6b7280" },
  tdeeValue: { fontSize: 24, fontWeight: "bold", color: "#16a34a" },
})
