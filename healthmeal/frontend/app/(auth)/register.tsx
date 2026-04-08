import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native"
import { useRouter } from "expo-router"
import { useAuthStore } from "../../store/authStore"
import { registerApi } from "../../services/auth"
import { zh } from "../../i18n/zh"

export default function RegisterScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const { setAuth, language } = useAuthStore()
  const t = zh
  const router = useRouter()

  async function handleRegister() {
    try {
      const data = await registerApi(email, password, language)
      await setAuth(data.access_token, data.role, data.language)
    } catch {
      Alert.alert(t.common.error, "注册失败，邮箱可能已被使用")
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.auth.register}</Text>
      <TextInput
        style={styles.input}
        placeholder={t.auth.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder={t.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>{t.auth.registerButton}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
        <Text style={styles.link}>{t.auth.hasAccount}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 32, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 16 },
  button: { backgroundColor: "#22c55e", borderRadius: 8, padding: 14, alignItems: "center", marginBottom: 16 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: "#22c55e", fontSize: 14 },
})
