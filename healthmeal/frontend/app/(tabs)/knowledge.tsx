import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl
} from "react-native"
import * as WebBrowser from "expo-web-browser"
import {
  getHealthContent, getBookmarks, addBookmark, removeBookmark,
  generateMealFromContent, HealthContentData
} from "../../services/knowledge"
import { zh } from "../../i18n/zh"

const t = zh.knowledge

type FilterType = "all" | "article" | "video" | "bookmarks"

function ContentCard({
  item, onToggleBookmark, onGenerateMeal
}: {
  item: HealthContentData
  onToggleBookmark: (id: number, bookmarked: boolean) => void
  onGenerateMeal: (id: number, title: string) => void
}) {
  const isVideo = item.type === "video"
  const summary = item.summary_zh || item.summary_en || ""

  async function handleOpen() {
    await WebBrowser.openBrowserAsync(item.url)
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, isVideo ? styles.videoBadge : styles.articleBadge]}>
          <Text style={styles.typeText}>{isVideo ? "视频" : "文章"}</Text>
        </View>
        <Text style={styles.source}>{item.source}</Text>
        {item.published_at && <Text style={styles.date}>{item.published_at}</Text>}
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      {summary.length > 0 && (
        <Text style={styles.summary} numberOfLines={3}>{summary}</Text>
      )}

      {item.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {item.tags.slice(0, 4).map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleOpen}>
          <Text style={styles.actionText}>{isVideo ? t.watchVideo : t.readMore}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, item.is_bookmarked ? styles.bookmarkedBtn : styles.bookmarkBtn]}
          onPress={() => onToggleBookmark(item.id, item.is_bookmarked)}
        >
          <Text style={[styles.actionText, item.is_bookmarked && styles.bookmarkedText]}>
            {item.is_bookmarked ? t.unbookmark : t.bookmark}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.generateBtn]}
          onPress={() => onGenerateMeal(item.id, item.title)}
        >
          <Text style={styles.generateText}>{t.generateMeal}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function KnowledgeScreen() {
  const [filter, setFilter] = useState<FilterType>("all")
  const [contents, setContents] = useState<HealthContentData[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingId, setGeneratingId] = useState<number | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (filter === "bookmarks") {
        const data = await getBookmarks()
        setContents(data)
      } else {
        const type = filter === "all" ? undefined : filter
        const data = await getHealthContent(type)
        setContents(data)
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter])

  useEffect(() => { loadData() }, [loadData])

  async function handleToggleBookmark(id: number, isBookmarked: boolean) {
    try {
      if (isBookmarked) {
        await removeBookmark(id)
      } else {
        await addBookmark(id)
      }
      setContents(prev => prev.map(c =>
        c.id === id ? { ...c, is_bookmarked: !isBookmarked } : c
      ))
    } catch {
      Alert.alert(zh.common.error)
    }
  }

  async function handleGenerateMeal(id: number, title: string) {
    setGeneratingId(id)
    try {
      const result = await generateMealFromContent(id)
      const summary = (result.meal_plan as any)?.summary
      Alert.alert(
        `基于《${result.based_on}》`,
        summary
          ? `今日热量：${summary.total_calories}kcal\n蛋白质：${summary.protein}g\n${summary.health_notes}`
          : "餐谱已生成，请前往「餐谱」Tab 查看历史记录"
      )
    } catch {
      Alert.alert(zh.common.error, "生成失败，请稍后重试")
    } finally {
      setGeneratingId(null)
    }
  }

  const filters: Array<{ key: FilterType; label: string }> = [
    { key: "all", label: t.all },
    { key: "article", label: t.articles },
    { key: "video", label: t.videos },
    { key: "bookmarks", label: t.bookmarks },
  ]

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10 }}>
        {filters.map(({ key, label }) => (
          <TouchableOpacity key={key}
            style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
            onPress={() => setFilter(key)}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadData() }} />}
        >
          {contents.length === 0 ? (
            <Text style={styles.empty}>
              {filter === "bookmarks" ? t.bookmarkEmpty : t.empty}
            </Text>
          ) : (
            contents.map((item) => (
              <View key={item.id}>
                {generatingId === item.id && (
                  <View style={styles.generatingRow}>
                    <ActivityIndicator color="#22c55e" size="small" />
                    <Text style={styles.generatingText}>正在生成餐谱...</Text>
                  </View>
                )}
                <ContentCard
                  item={item}
                  onToggleBookmark={handleToggleBookmark}
                  onGenerateMeal={handleGenerateMeal}
                />
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  filterRow: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", maxHeight: 56 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, marginRight: 8, backgroundColor: "#f3f4f6" },
  filterBtnActive: { backgroundColor: "#22c55e" },
  filterText: { fontSize: 14, color: "#6b7280" },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 60, fontSize: 15 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  articleBadge: { backgroundColor: "#dbeafe" },
  videoBadge: { backgroundColor: "#fce7f3" },
  typeText: { fontSize: 11, fontWeight: "600", color: "#374151" },
  source: { fontSize: 12, color: "#6b7280", flex: 1 },
  date: { fontSize: 11, color: "#9ca3af" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#111827", marginBottom: 8, lineHeight: 22 },
  summary: { fontSize: 13, color: "#6b7280", lineHeight: 19, marginBottom: 10 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, color: "#16a34a" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#e5e7eb" },
  actionText: { fontSize: 12, color: "#374151" },
  bookmarkBtn: { borderColor: "#e5e7eb" },
  bookmarkedBtn: { borderColor: "#22c55e", backgroundColor: "#f0fdf4" },
  bookmarkedText: { color: "#16a34a" },
  generateBtn: { borderColor: "#7c3aed", backgroundColor: "#f5f3ff" },
  generateText: { fontSize: 12, color: "#7c3aed" },
  generatingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 4 },
  generatingText: { marginLeft: 8, fontSize: 13, color: "#22c55e" },
})
