import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, ActivityIndicator, Switch
} from "react-native"
import * as Sharing from "expo-sharing"
import * as FileSystem from "expo-file-system/legacy"
import {
  generateShoppingList, getShoppingLists, sendFriendRequest,
  getFriendRequests, acceptFriendRequest, getFriends,
  ShoppingListData, FriendshipData
} from "../../services/social"
import { getMealPlanHistory } from "../../services/meal"
import { useTranslation } from "../../hooks/useTranslation"
import { useAuthStore } from "../../store/authStore"

type TabKey = "shopping" | "friends" | "requests"

function ShoppingListView() {
  const { t: i18n, language } = useTranslation()
  const t = i18n.social
  const [lists, setLists] = useState<ShoppingListData[]>([])
  const [generating, setGenerating] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    try {
      const data = await getShoppingLists()
      setLists(data)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleGenerate() {
    setGenerating(true)
    try {
      await generateShoppingList(language)
      await load()
    } catch {
      Alert.alert(i18n.common.error, t.noItems)
    } finally {
      setGenerating(false)
    }
  }

  const toggleItem = (listId: number, itemName: string) => {
    const key = `${listId}_${itemName}`
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const latest = lists[0]

  return (
    <View>
      <TouchableOpacity style={styles.primaryBtn} onPress={handleGenerate} disabled={generating}>
        {generating
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.primaryBtnText}>{t.generateList}</Text>
        }
      </TouchableOpacity>

      {latest ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.shoppingList} — {latest.date}</Text>
          {latest.items?.map((item, i) => {
            const key = `${latest.id}_${item.name}`
            const checked = checkedItems[key] || false
            return (
              <View key={i} style={styles.itemRow}>
                <Switch value={checked} onValueChange={() => toggleItem(latest.id, item.name)}
                  trackColor={{ false: "#e8f0e8", true: "#16a34a" }} />
                <Text style={[styles.itemText, checked && styles.itemChecked]}>
                  {item.name} {item.quantity}{item.unit}
                </Text>
              </View>
            )
          })}
        </View>
      ) : (
        <Text style={styles.empty}>{t.noItems}</Text>
      )}
    </View>
  )
}

function FriendsView() {
  const { t: i18n } = useTranslation()
  const t = i18n.social
  const { token, email: currentEmail } = useAuthStore()
  const [friends, setFriends] = useState<FriendshipData[]>([])
  const [email, setEmail] = useState("")
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getFriends()
      setFriends(data)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSend() {
    if (!email.trim()) return
    setSending(true)
    try {
      await sendFriendRequest(email.trim())
      setEmail("")
      Alert.alert("", t.requestSent)
    } catch {
      Alert.alert(i18n.common.error, t.requestFail)
    } finally {
      setSending(false)
    }
  }

  async function handleShareMealPlan() {
    try {
      const history = await getMealPlanHistory()
      if (!history || history.length === 0) {
        Alert.alert("", t.noMealPlan)
        return
      }
      const plan = history[0]
      const c = plan.content
      let text = `🍽 ${t.shareTitle} (HealthMeal)\n\n`
      if (c.breakfast) {
        text += `🌅 Breakfast: ${c.breakfast.name}\n   ${c.breakfast.calories}kcal · Protein ${c.breakfast.protein}g\n`
        if (c.breakfast.ingredients?.length) text += `   Ingredients: ${c.breakfast.ingredients.join(", ")}\n`
        if (c.breakfast.steps?.length) text += `   Steps:\n${c.breakfast.steps.map((s: string, i: number) => `   ${i + 1}. ${s}`).join("\n")}\n`
        text += "\n"
      }
      if (c.lunch) {
        text += `☀️ Lunch: ${c.lunch.name}\n   ${c.lunch.calories}kcal · Protein ${c.lunch.protein}g\n`
        if (c.lunch.ingredients?.length) text += `   Ingredients: ${c.lunch.ingredients.join(", ")}\n`
        if (c.lunch.steps?.length) text += `   Steps:\n${c.lunch.steps.map((s: string, i: number) => `   ${i + 1}. ${s}`).join("\n")}\n`
        text += "\n"
      }
      if (c.dinner) {
        text += `🌙 Dinner: ${c.dinner.name}\n   ${c.dinner.calories}kcal · Protein ${c.dinner.protein}g\n`
        if (c.dinner.ingredients?.length) text += `   Ingredients: ${c.dinner.ingredients.join(", ")}\n`
        if (c.dinner.steps?.length) text += `   Steps:\n${c.dinner.steps.map((s: string, i: number) => `   ${i + 1}. ${s}`).join("\n")}\n`
        text += "\n"
      }
      if (c.summary) {
        text += `📊 Total: ${c.summary.total_calories}kcal · Anti-inflammatory ${c.summary.anti_inflammatory_score}/10\n`
        if (c.summary.health_notes) text += `💡 ${c.summary.health_notes}\n`
      }
      text += `\n— Generated by HealthMeal`

      const available = await Sharing.isAvailableAsync()
      if (available) {
        const fileUri = (FileSystem.documentDirectory || "") + "meal_plan.txt"
        await FileSystem.writeAsStringAsync(fileUri, text)
        await Sharing.shareAsync(fileUri)
      } else {
        Alert.alert("", t.shareNotSupported)
      }
    } catch (e: any) {
      Alert.alert(i18n.common.error, `${e?.message || e}`)
    }
  }

  return (
    <View>
      <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: "#7c3aed" }]} onPress={handleShareMealPlan}>
        <Text style={styles.primaryBtnText}>{t.share}</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t.addFriend}</Text>
        <TextInput style={styles.input} placeholder={t.friendEmail}
          value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
          <Text style={styles.sendBtnText}>{sending ? t.sending : t.send}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>{t.friends}</Text>
      {friends.length === 0 ? (
        <Text style={styles.empty}>{t.noFriends}</Text>
      ) : (
        friends.map((f) => (
          <View key={f.id} style={styles.friendRow}>
            <Text style={styles.friendEmail}>
              {currentEmail && f.requester_email === currentEmail ? f.addressee_email : f.requester_email}
            </Text>
            <Text style={styles.acceptedBadge}>{t.accepted}</Text>
          </View>
        ))
      )}
    </View>
  )
}

function RequestsView() {
  const { t: i18n } = useTranslation()
  const t = i18n.social
  const [requests, setRequests] = useState<FriendshipData[]>([])

  const load = useCallback(async () => {
    try {
      const data = await getFriendRequests()
      setRequests(data)
    } catch { /* 静默 */ }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAccept(id: number) {
    try {
      await acceptFriendRequest(id)
      setRequests(prev => prev.filter(r => r.id !== id))
      Alert.alert("", t.acceptedMsg)
    } catch {
      Alert.alert(i18n.common.error)
    }
  }

  return (
    <View>
      {requests.length === 0 ? (
        <Text style={styles.empty}>{t.noRequests}</Text>
      ) : (
        requests.map((r) => (
          <View key={r.id} style={styles.requestRow}>
            <Text style={styles.friendEmail}>{r.requester_email}</Text>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(r.id)}>
              <Text style={styles.acceptBtnText}>{t.accept}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  )
}

export default function SocialScreen() {
  const { t: i18n } = useTranslation()
  const t = i18n.social
  const [tab, setTab] = useState<TabKey>("shopping")

  const tabs: Array<{ key: TabKey; label: string }> = [
    { key: "shopping", label: t.shoppingList },
    { key: "friends", label: t.friends },
    { key: "requests", label: t.requests },
  ]

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {tabs.map(({ key, label }) => (
          <TouchableOpacity key={key}
            style={[styles.tabBtn, tab === key && styles.tabBtnActive]}
            onPress={() => setTab(key)}>
            <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {tab === "shopping" && <ShoppingListView />}
        {tab === "friends" && <FriendsView />}
        {tab === "requests" && <RequestsView />}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f7f2" },
  tabRow: { flexDirection: "row", backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e8f0e8" },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: "center" },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: "#16a34a" },
  tabText: { fontSize: 13, color: "#9ca3af" },
  tabTextActive: { color: "#16a34a", fontWeight: "600" },
  content: { padding: 16, paddingBottom: 40 },
  primaryBtn: { backgroundColor: "#16a34a", borderRadius: 14, height: 52, justifyContent: "center", alignItems: "center", marginBottom: 16 },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  cardTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 12, color: "#1a1a1a" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  itemText: { marginLeft: 12, fontSize: 15, color: "#1a1a1a" },
  itemChecked: { textDecorationLine: "line-through", color: "#9ca3af" },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40, fontSize: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 8, color: "#1a1a1a" },
  friendRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 8 },
  requestRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: "#fff", borderRadius: 8, padding: 14, marginBottom: 8 },
  friendEmail: { fontSize: 14, color: "#1a1a1a", flex: 1 },
  acceptedBadge: { fontSize: 12, color: "#16a34a", fontWeight: "600" },
  acceptBtn: { backgroundColor: "#16a34a", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  acceptBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 12, padding: 10, marginBottom: 10, fontSize: 15 },
  sendBtn: { backgroundColor: "#3b82f6", borderRadius: 8, padding: 12, alignItems: "center" },
  sendBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
})
