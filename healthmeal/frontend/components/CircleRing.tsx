// frontend/components/CircleRing.tsx
import { View, Text, StyleSheet } from "react-native"

interface Props {
  value: number
  target: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  unit?: string
}

export function CircleRing({
  value, target, size = 100, strokeWidth = 10,
  color = "#16a34a", label, unit = "kcal"
}: Props) {
  const pct = Math.min(value / (target || 1), 1)
  const inner = Math.max(size - strokeWidth * 2, 0)
  const deg = Math.round(pct * 360)
  const half = deg > 180

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* 底圈 */}
      <View style={[s.track, { width: size, height: size, borderRadius: size / 2, borderWidth: strokeWidth, borderColor: "#e8f0e8" }]} />
      {/* 进度圈 */}
      <View style={[s.abs, { width: size, height: size, transform: [{ rotate: "-90deg" }] }]}>
        <View style={[s.half, { width: size / 2, height: size, left: size / 2 }]}>
          <View style={[s.arc, {
            width: size, height: size, borderRadius: size / 2,
            borderWidth: strokeWidth, borderColor: color,
            transform: [{ rotate: `${Math.min(deg, 180)}deg` }],
            left: -size / 2,
          }]} />
        </View>
        {half && (
          <View style={[s.half, { width: size / 2, height: size, left: 0, overflow: "hidden" }]}>
            <View style={[s.arc, {
              width: size, height: size, borderRadius: size / 2,
              borderWidth: strokeWidth, borderColor: color,
              transform: [{ rotate: `${deg - 180}deg` }],
            }]} />
          </View>
        )}
      </View>
      {/* 中心文字 */}
      <View style={[s.abs, { alignItems: "center", justifyContent: "center", width: inner, height: inner }]}>
        <Text style={{ fontSize: size * 0.22, fontWeight: "bold", color: "#1a1a1a" }}>{Math.round(value)}</Text>
        {unit ? <Text style={{ fontSize: size * 0.1, color: "#9ca3af" }}>{unit}</Text> : null}
        {label ? <Text style={{ fontSize: size * 0.1, color: "#9ca3af" }}>{label}</Text> : null}
      </View>
    </View>
  )
}

const s = StyleSheet.create({
  track: { position: "absolute" },
  abs: { position: "absolute" },
  half: { position: "absolute", overflow: "hidden" },
  arc: { position: "absolute", borderTopColor: "transparent", borderLeftColor: "transparent" },
})
