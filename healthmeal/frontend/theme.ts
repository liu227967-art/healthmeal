// HealthMeal 全局主题
export const colors = {
  primary: "#16a34a",
  primaryLight: "#dcfce7",
  primaryMid: "#86efac",
  bg: "#f2f7f2",
  card: "#ffffff",
  border: "#e8f0e8",
  textPrimary: "#1a1a1a",
  textSecondary: "#6b7280",
  textTertiary: "#9ca3af",
  accent: "#3b82f6",
  danger: "#ef4444",
  warning: "#f59e0b",
  purple: "#7c3aed",
}

export const card = {
  backgroundColor: "#ffffff",
  borderRadius: 16,
  padding: 20,
  marginBottom: 12,
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 3,
}

export const btn = {
  primary: {
    backgroundColor: "#16a34a",
    borderRadius: 14,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  secondary: {
    backgroundColor: "#3b82f6",
    borderRadius: 14,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  danger: {
    backgroundColor: "#ef4444",
    borderRadius: 14,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  ghost: {
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    height: 52,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
}

export const btnText = {
  primary: { color: "#fff", fontSize: 17, fontWeight: "600" as const },
  ghost: { color: "#374151", fontSize: 17, fontWeight: "400" as const },
}

export const input = {
  borderWidth: 1,
  borderColor: "#e8f0e8",
  borderRadius: 12,
  padding: 14,
  fontSize: 15,
  color: "#1a1a1a",
  backgroundColor: "#fff",
  marginBottom: 12,
}

export const typography = {
  bigNumber: { fontSize: 36, fontWeight: "bold" as const, color: "#1a1a1a" },
  pageTitle: { fontSize: 20, fontWeight: "700" as const, color: "#1a1a1a" },
  cardTitle: { fontSize: 17, fontWeight: "600" as const, color: "#1a1a1a" },
  body: { fontSize: 15, color: "#1a1a1a" },
  secondary: { fontSize: 13, color: "#6b7280" },
  badge: { fontSize: 11, fontWeight: "600" as const },
}
