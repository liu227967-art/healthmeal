import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { useAuthStore } from "../../store/authStore"
import { loginApi } from "../../services/auth"
import { useTranslation } from "../../hooks/useTranslation"

export default function LoginScreen() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const { setAuth } = useAuthStore()
  const { t: i18n } = useTranslation()
  const t = i18n
  const router = useRouter()

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t.common.error, t.auth.loginFail)
      return
    }
    setLoading(true)
    try {
      const data = await loginApi(email, password)
      await setAuth(data.access_token, data.role, data.language, email)
    } catch {
      Alert.alert(t.common.error, t.auth.loginFail)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t.auth.login}</Text>
      <TextInput
        style={styles.input}
        placeholder={t.auth.email}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        editable={!loading}
      />
      <TextInput
        style={styles.input}
        placeholder={t.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        editable={!loading}
      />
      <TouchableOpacity style={[styles.button, loading && { opacity: 0.7 }]} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t.auth.loginButton}</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => router.push("/(auth)/register")} disabled={loading}>
        <Text style={styles.link}>{t.auth.noAccount}</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 28, backgroundColor: "#f2f7f2" },
  title: { fontSize: 32, fontWeight: "700", marginBottom: 8, textAlign: "center", color: "#1a1a1a" },
  subtitle: { fontSize: 15, color: "#6b7280", textAlign: "center", marginBottom: 36 },
  input: { borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 14, padding: 16, marginBottom: 14, fontSize: 16, backgroundColor: "#fff" },
  button: { backgroundColor: "#16a34a", borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginBottom: 16, shadowColor: "#16a34a", shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
  link: { textAlign: "center", color: "#16a34a", fontSize: 15, marginTop: 4 },
})
