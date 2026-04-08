import { useState, useEffect, useCallback } from "react"
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator
} from "react-native"
import * as ImagePicker from "expo-image-picker"
import { Picker } from "@react-native-picker/picker"
import {
  getIngredients, addIngredient, deleteIngredient,
  identifyIngredientsFromPhoto, IngredientData
} from "../../services/meal"
import { zh } from "../../i18n/zh"

const todayStr = () => new Date().toISOString().split("T")[0]
const t = zh.ingredients

export default function IngredientsScreen() {
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
    if (!name.trim()) return
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
      await load()
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  async function handlePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) {
      Alert.alert("需要相机权限")
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    })
    if (result.canceled || !result.assets?.[0]?.base64) return
    setLoading(true)
    try {
      await identifyIngredientsFromPhoto(result.assets[0].base64)
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
    <View style={styles.container}>
      <Text style={styles.title}>{t.title}</Text>

      {/* 手动输入区 */}
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder={t.name}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, { flex: 1, marginLeft: 8 }]}
          placeholder={t.quantity}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Picker selectedValue={unit} onValueChange={setUnit} style={styles.picker}>
            <Picker.Item label="g" value="g" />
            <Picker.Item label="ml" value="ml" />
            <Picker.Item label="个" value="个" />
            <Picker.Item label="片" value="片" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.addButton} onPress={handleAddManual}>
        <Text style={styles.addButtonText}>{t.addManual}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.addButton, styles.photoButton]} onPress={handlePhoto} disabled={loading}>
        <Text style={styles.addButtonText}>{loading ? t.recognizing : t.addPhoto}</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 12 }} />}

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
                <Text style={styles.itemSub}>{item.quantity}{item.unit} · {item.input_method}</Text>
              </View>
              <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 16 },
  inputRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 15 },
  picker: { height: 44 },
  addButton: { backgroundColor: "#22c55e", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 8 },
  photoButton: { backgroundColor: "#3b82f6" },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  empty: { textAlign: "center", color: "#999", marginTop: 40, fontSize: 15 },
  list: { marginTop: 8 },
  item: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },
  itemName: { fontSize: 16, fontWeight: "500" },
  itemSub: { fontSize: 13, color: "#888", marginTop: 2 },
  deleteBtn: { padding: 8 },
  deleteText: { color: "#ef4444", fontSize: 16, fontWeight: "bold" },
})
