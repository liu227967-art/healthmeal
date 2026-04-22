import { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Keyboard
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import {
  getIngredients, addIngredient, deleteIngredient,
  identifyIngredientsFromPhoto, IngredientData
} from "../../services/meal"
import { useTranslation } from "../../hooks/useTranslation"

const todayStr = () => new Date().toISOString().split("T")[0]
const UNITS = ["g", "ml", "个", "片"]
const UNIT_LABELS: Record<string, Record<string, string>> = {
  zh: { g: "g", ml: "ml", "个": "个", "片": "片" },
  en: { g: "g", ml: "ml", "个": "pc", "片": "slice" },
}

export default function IngredientsScreen() {
  const { t: i18n, language } = useTranslation()
  const t = i18n.ingredients
  const [ingredients, setIngredients] = useState<IngredientData[]>([])
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("100")
  const [unit, setUnit] = useState("g")
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const data = await getIngredients(todayStr())
      setIngredients(data)
    } catch {
      // 静默失败，离线时不报错
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAddManual() {
    if (!name.trim()) {
      Alert.alert("请输入食材名称")
      return
    }
    try {
      await addIngredient({
        name: name.trim(),
        quantity: parseFloat(quantity) || 100,
        unit,
        input_method: "manual",
        date: todayStr(),
      })
      setName("")
      setQuantity("100")
      Keyboard.dismiss()
      await load()
    } catch (e: any) {
      Alert.alert("添加失败", e?.response?.data?.detail || e?.message || "请检查网络连接")
    }
  }

  async function handlePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert("需要相机权限")
      return
    }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
    if (result.canceled || !result.assets?.[0]?.base64) return
    setLoading(true)
    try {
      await identifyIngredientsFromPhoto(result.assets[0].base64, language)
      await load()
    } catch {
      Alert.alert(zh.common.error, "识别失败，请重试")
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteIngredient(id)
      await load()
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <Text style={styles.title}>{t.title}</Text>

      {/* 名称 + 数量 */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder={t.name}
          value={name}
          onChangeText={setName}
          returnKeyType="done"
          onSubmitEditing={handleAddManual}
        />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          placeholder={t.quantity}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
          returnKeyType="done"
          onSubmitEditing={Keyboard.dismiss}
        />
      </View>

      {/* 单位选择 */}
      <View style={styles.unitRow}>
        {UNITS.map(u => (
          <TouchableOpacity
            key={u}
            style={[styles.unitBtn, unit === u && styles.unitBtnActive]}
            onPress={() => setUnit(u)}
          >
            <Text style={[styles.unitBtnText, unit === u && styles.unitBtnTextActive]}>
              {(UNIT_LABELS[language] || UNIT_LABELS.en)[u] || u}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddManual}>
        <Text style={styles.addButtonText}>{t.addManual}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.addButton, styles.photoButton]} onPress={handlePhoto} disabled={loading}>
        <Text style={styles.addButtonText}>{loading ? t.recognizing : t.addPhoto}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 12 }} />}

      {/* 食材列表 */}
      {ingredients.length === 0 ? (
        <Text style={styles.empty}>{t.empty}</Text>
      ) : (
        <FlatList
          data={ingredients}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          renderItem={({ item }) => (
            <View style={styles.item}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemSub}>{item.quantity}{(UNIT_LABELS[language] || UNIT_LABELS.zh)[item.unit] || item.unit} · {item.input_method}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f7f2", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", color: "#1a1a1a", marginBottom: 16 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 12, padding: 10, fontSize: 15, backgroundColor: "#fff" },
  unitRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  unitBtn: { flex: 1, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: "#e8f0e8", alignItems: "center", backgroundColor: "#fff" },
  unitBtnActive: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  unitBtnText: { fontSize: 14, color: "#1a1a1a" },
  unitBtnTextActive: { color: "#fff", fontWeight: "600" },
  addButton: { backgroundColor: "#16a34a", borderRadius: 14, padding: 14, alignItems: "center", marginBottom: 8 },
  photoButton: { backgroundColor: "#3b82f6" },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 40, fontSize: 15 },
  list: { marginTop: 8, flex: 1 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, marginBottom: 8, backgroundColor: "#fff", borderRadius: 16, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  itemName: { fontSize: 16, fontWeight: "500", color: "#1a1a1a" },
  itemSub: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
})
