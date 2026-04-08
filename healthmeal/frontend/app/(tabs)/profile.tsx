import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native"
import { Picker } from "@react-native-picker/picker"
import { getProfile, updateProfile, ProfileData } from "../../services/profile"
import { zh } from "../../i18n/zh"

export default function ProfileScreen() {
  const t = zh.profile
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
      Alert.alert("", zh.common.success)
    } catch {
      Alert.alert(zh.common.error)
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

      <Text style={styles.label}>{t.goal}</Text>
      <Picker selectedValue={form.goal} onValueChange={(v) => setForm({ ...form, goal: v })}>
        <Picker.Item label={t.goals.reduce_fat} value="reduce_fat" />
        <Picker.Item label={t.goals.maintain} value="maintain" />
        <Picker.Item label={t.goals.gain_muscle} value="gain_muscle" />
      </Picker>

      {tdee && (
        <View style={styles.tdeeBox}>
          <Text style={styles.tdeeLabel}>{t.tdee}</Text>
          <Text style={styles.tdeeValue}>{tdee} kcal/天</Text>
        </View>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>{t.save}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 24 },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 24 },
  field: { marginBottom: 16 },
  label: { fontSize: 14, color: "#666", marginBottom: 4 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, fontSize: 16 },
  button: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tdeeBox: { backgroundColor: "#f0fdf4", borderRadius: 8, padding: 16, marginTop: 16 },
  tdeeLabel: { fontSize: 14, color: "#166534" },
  tdeeValue: { fontSize: 24, fontWeight: "bold", color: "#166534" },
})
