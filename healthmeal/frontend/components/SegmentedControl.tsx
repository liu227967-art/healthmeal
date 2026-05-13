import { View, Text, TouchableOpacity, StyleSheet } from "react-native"

interface Option {
  label: string
  value: string
}

interface Props {
  options: Option[]
  value: string
  onChange: (value: string) => void
  wrap?: boolean
}

export function SegmentedControl({ options, value, onChange, wrap = false }: Props) {
  return (
    <View style={[styles.row, wrap && styles.wrap]}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.btn, value === opt.value && styles.btnActive, wrap && styles.btnWrap]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.text, value === opt.value && styles.textActive]}>{opt.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", backgroundColor: "#f2f7f2", borderRadius: 12, padding: 3 },
  wrap: { flexWrap: "wrap", gap: 4 },
  btn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  btnWrap: { flex: 0, paddingHorizontal: 14 },
  btnActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  text: { fontSize: 13, color: "#6b7280" },
  textActive: { color: "#16a34a", fontWeight: "600" },
})
