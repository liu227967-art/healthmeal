import { useState, useEffect, useCallback } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Platform } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { useRouter } from "expo-router"
import { getProfile, updateProfile, ProfileData } from "../../services/profile"
import { logExercise } from "../../services/tracking"
import { useTranslation } from "../../hooks/useTranslation"
import { useAuthStore } from "../../store/authStore"
import {
  sendFriendRequest, getFriendRequests, acceptFriendRequest, getFriends,
  FriendshipData
} from "../../services/social"
import { getWeeklySummary, getMonthlySummary, WeeklySummary, MonthlySummary } from "../../services/tracking"

export default function ProfileScreen() {
  const { t: i18n } = useTranslation()
  const t = i18n.profile
  const { logout, email: currentEmail } = useAuthStore()
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
  const [profileTab, setProfileTab] = useState<"info" | "stats" | "friends">("info")
  const [friends, setFriends] = useState<FriendshipData[]>([])
  const [friendRequests, setFriendRequests] = useState<FriendshipData[]>([])
  const [friendEmail, setFriendEmail] = useState("")
  const [weeklySummary, setWeeklySummary] = useState<WeeklySummary | null>(null)
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary | null>(null)
  const [statsTab, setStatsTab] = useState<"weekly" | "monthly">("weekly")

  useEffect(() => {
    getProfile().then((data) => {
      if (data) {
        setForm(data)
        setTdee(data.tdee ?? null)
      }
    })
  }, [])

  const todayStr = () => new Date().toISOString().split("T")[0]

  const loadFriends = useCallback(async () => {
    try {
      const [f, r] = await Promise.all([getFriends(), getFriendRequests()])
      setFriends(f)
      setFriendRequests(r)
    } catch {}
  }, [])

  const loadStats = useCallback(async () => {
    try {
      const today = todayStr()
      if (statsTab === "weekly") setWeeklySummary(await getWeeklySummary(today))
      else setMonthlySummary(await getMonthlySummary(today))
    } catch {}
  }, [statsTab])

  useEffect(() => {
    if (profileTab === "friends") loadFriends()
    if (profileTab === "stats") loadStats()
  }, [profileTab, statsTab, loadFriends, loadStats])

  async function handleSendFriendRequest() {
    if (!friendEmail.trim()) return
    try {
      await sendFriendRequest(friendEmail.trim())
      setFriendEmail("")
      Alert.alert("", i18n.social.requestSent)
    } catch { Alert.alert(i18n.common.error) }
  }

  async function handleAcceptFriend(id: number) {
    try { await acceptFriendRequest(id); await loadFriends() } catch {}
  }

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
      Alert.alert("", i18n.common.appleHealthIosOnly)
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
      await logExercise({
        type: "cardio",
        detail: { activity: "walking", duration_min: Math.round(steps / 100), intensity: "low", steps }
      })
      Alert.alert(
        i18n.common.appleHealthSyncSuccess,
        i18n.common.appleHealthSyncSuccessMsg
          .replace("{steps}", String(steps))
          .replace("{calories}", String(calories))
      )
    } catch {
      Alert.alert(i18n.common.appleHealthSyncFail, i18n.common.appleHealthSyncFailMsg)
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

      <View style={ps.tabRow}>
        {([["info", t.infoTab], ["stats", t.statsTab], ["friends", t.friendsTab]] as const).map(([key, label]) => (
          <TouchableOpacity key={key} style={[ps.tab, profileTab === key && ps.tabActive]}
            onPress={() => setProfileTab(key)}>
            <Text style={[ps.tabText, profileTab === key && ps.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {profileTab === "info" && (
        <View>
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
        </View>
      )}

      {profileTab === "stats" && (
        <View style={{ padding: 16 }}>
          <View style={ps.tabRow}>
            {([["weekly", t.weeklyTab], ["monthly", t.monthlyTab]] as const).map(([key, label]) => (
              <TouchableOpacity key={key} style={[ps.tab, statsTab === key && ps.tabActive]}
                onPress={() => setStatsTab(key)}>
                <Text style={[ps.tabText, statsTab === key && ps.tabTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {statsTab === "weekly" && weeklySummary && (
            <View style={ps.card}>
              <Text style={ps.cardTitle}>{t.weeklyCalorieTrend}</Text>
              {weeklySummary.daily_calories?.map((day, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "center", marginVertical: 4 }}>
                  <Text style={{ width: 40, fontSize: 12, color: "#6b7280" }}>{day.date?.slice(5)}</Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: "#f3f4f6", borderRadius: 4, marginHorizontal: 8 }}>
                    <View style={{ height: 8, borderRadius: 4, backgroundColor: "#16a34a", width: `${Math.min((day.calories / 2000) * 100, 100)}%` as any }} />
                  </View>
                  <Text style={{ width: 60, fontSize: 12, color: "#1a1a1a", textAlign: "right" }}>{day.calories} kcal</Text>
                </View>
              ))}
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
                <Text style={{ fontSize: 13, color: "#6b7280" }}>
                  {t.avgProteinLabel}：<Text style={{ color: "#3b82f6", fontWeight: "600" }}>{Math.round(weeklySummary.avg_protein ?? 0)}g</Text>
                </Text>
                <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                  {t.antiScoreLabel}：<Text style={{ color: "#16a34a", fontWeight: "600" }}>{weeklySummary.avg_anti_inflammatory?.toFixed(1)}/10</Text>
                </Text>
              </View>
            </View>
          )}
          {statsTab === "weekly" && !weeklySummary && (
            <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, paddingVertical: 40 }}>{t.noWeeklyData}</Text>
          )}
          {statsTab === "monthly" && monthlySummary && (
            <View style={ps.card}>
              <Text style={ps.cardTitle}>{t.monthlyOverview}</Text>
              <Text style={{ fontSize: 13, color: "#6b7280" }}>
                {t.daysLoggedLabel}：<Text style={{ color: "#16a34a", fontWeight: "600" }}>{monthlySummary.total_days_logged} {i18n.common.perDay}</Text>
              </Text>
              <Text style={{ fontSize: 13, color: "#6b7280", marginTop: 4 }}>
                {t.avgAntiLabel}：<Text style={{ color: "#16a34a", fontWeight: "600" }}>{monthlySummary.avg_anti_inflammatory?.toFixed(1)}/10</Text>
              </Text>
            </View>
          )}
          {statsTab === "monthly" && !monthlySummary && (
            <Text style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, paddingVertical: 40 }}>{t.noMonthlyData}</Text>
          )}
        </View>
      )}

      {profileTab === "friends" && (
        <View style={{ padding: 16 }}>
          <View style={[ps.card, { flexDirection: "row", gap: 8 }]}>
            <TextInput
              style={[ps.input, { flex: 1 }]}
              placeholder={t.friendEmailPlaceholder}
              value={friendEmail}
              onChangeText={setFriendEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TouchableOpacity style={ps.addBtn} onPress={handleSendFriendRequest}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>{t.addFriendBtn}</Text>
            </TouchableOpacity>
          </View>
          {friendRequests.length > 0 && (
            <View style={ps.card}>
              <Text style={ps.cardTitle}>{t.pendingRequests}</Text>
              {friendRequests.map(req => (
                <View key={req.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                  <Text style={{ flex: 1, fontSize: 14, color: "#1a1a1a" }}>{req.requester_email}</Text>
                  <TouchableOpacity style={ps.acceptBtn} onPress={() => handleAcceptFriend(req.id)}>
                    <Text style={{ color: "#fff", fontSize: 13 }}>{t.acceptBtn}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={ps.card}>
            <Text style={ps.cardTitle}>{t.myFriends}（{friends.length}）</Text>
            {friends.length === 0 ? (
              <Text style={{ color: "#9ca3af", fontSize: 14, paddingVertical: 8 }}>{t.noFriendsYet}</Text>
            ) : (
              friends.map(f => (
                <View key={f.id} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#e8f0e8", alignItems: "center", justifyContent: "center", marginRight: 10 }}>
                    <Text style={{ fontSize: 16 }}>👤</Text>
                  </View>
                  <Text style={{ fontSize: 14, color: "#1a1a1a" }}>
                    {currentEmail && f.requester_email === currentEmail ? f.addressee_email : f.requester_email}
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>
      )}
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

const ps = StyleSheet.create({
  tabRow: { flexDirection: "row", backgroundColor: "#f2f7f2", borderRadius: 12, padding: 4, margin: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, color: "#6b7280" },
  tabTextActive: { color: "#16a34a", fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: "#1a1a1a", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 10, padding: 10, fontSize: 14, backgroundColor: "#fff" },
  addBtn: { backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 16, justifyContent: "center", alignItems: "center" },
  acceptBtn: { backgroundColor: "#16a34a", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
})
