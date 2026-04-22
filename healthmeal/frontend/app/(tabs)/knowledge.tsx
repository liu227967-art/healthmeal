import { useState, useEffect, useCallback } from "react"
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, RefreshControl,
  Modal, TextInput, KeyboardAvoidingView, Platform
} from "react-native"
import * as WebBrowser from "expo-web-browser"
import {
  getHealthContent, getBookmarks, addBookmark, removeBookmark,
  generateMealFromContent, createNote, deleteNote, HealthContentData
} from "../../services/knowledge"
import { useTranslation } from "../../hooks/useTranslation"

type FilterType = "all" | "article" | "video" | "note" | "bookmarks"
type LangFilter = "all" | "zh" | "en"

function ContentCard({
  item, onToggleBookmark, onGenerateMeal
}: {
  item: HealthContentData
  onToggleBookmark: (id: number, bookmarked: boolean) => void
  onGenerateMeal: (id: number, title: string) => void
}) {
  const { t: i18n, language } = useTranslation()
  const t = i18n.knowledge
  const isVideo = item.type === "video"
  const isNote = item.type === "note"
  const badgeLabel = isNote ? t.notes : isVideo ? t.videos : t.articles
  const summary = language === "en"
    ? (item.summary_en || item.summary_zh || "")
    : (item.summary_zh || item.summary_en || "")

  async function handleOpen() {
    await WebBrowser.openBrowserAsync(item.url)
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, isNote ? styles.noteBadge : isVideo ? styles.videoBadge : styles.articleBadge]}>
          <Text style={styles.typeText}>{badgeLabel}</Text>
        </View>
        <Text style={styles.source}>{isNote ? t.personalNote : item.source}</Text>
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
  const { t: i18n, language } = useTranslation()
  const t = i18n.knowledge
  const [filter, setFilter] = useState<FilterType>("all")
  const [lang, setLang] = useState<LangFilter>("all")
  const [contents, setContents] = useState<HealthContentData[]>([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [generatingId, setGeneratingId] = useState<number | null>(null)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteTitle, setNoteTitle] = useState("")
  const [noteContent, setNoteContent] = useState("")
  const [noteLang, setNoteLang] = useState<"zh" | "en">("zh")
  const [savingNote, setSavingNote] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (filter === "bookmarks") {
        const data = await getBookmarks()
        setContents(data)
      } else {
        const type = filter === "all" ? undefined : filter
        const langParam = lang === "all" ? undefined : lang
        const data = await getHealthContent(type, langParam)
        setContents(data)
      }
    } catch {
      // 静默失败
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filter, lang])

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

  async function handleSaveNote() {
    if (!noteTitle.trim()) { Alert.alert("请输入标题"); return }
    if (!noteContent.trim()) { Alert.alert("请输入内容"); return }
    setSavingNote(true)
    try {
      await createNote({ title: noteTitle.trim(), content: noteContent.trim(), lang: noteLang, tags: [] })
      setNoteTitle(""); setNoteContent(""); setNoteLang("zh")
      setShowNoteModal(false)
      await loadData()
    } catch {
      Alert.alert(i18n.common.error, t.saving)
    } finally {
      setSavingNote(false)
    }
  }

  async function handleDeleteNote(id: number) {
    Alert.alert(t.deleteNote, t.deleteNoteConfirm, [
      { text: i18n.common.cancel, style: "cancel" },
      { text: t.delete, style: "destructive", onPress: async () => {
        try {
          await deleteNote(id)
          await loadData()
        } catch {
          Alert.alert(zh.common.error)
        }
      }}
    ])
  }

  const filters: Array<{ key: FilterType; label: string }> = [
    { key: "all", label: t.all },
    { key: "article", label: t.articles },
    { key: "video", label: t.videos },
    { key: "note", label: t.notes },
    { key: "bookmarks", label: t.bookmarks },
  ]

  return (
    <View style={styles.container}>
      {/* 顶部筛选 + 新建笔记按钮 */}
      <View style={styles.topBar}>
        <View style={styles.filterRow}>
          {filters.map(({ key, label }) => (
            <TouchableOpacity key={key}
              style={[styles.filterBtn, filter === key && styles.filterBtnActive]}
              onPress={() => setFilter(key)}>
              <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.addNoteBtn} onPress={() => setShowNoteModal(true)}>
          <Text style={styles.addNoteBtnText}>{t.addNote}</Text>
        </TouchableOpacity>
      </View>

      {/* 语言筛选 */}
      <View style={styles.langRow}>
        {([["all", t.allLang], ["zh", "中文"], ["en", "English"]] as [LangFilter, string][]).map(([key, label]) => (
          <TouchableOpacity key={key}
            style={[styles.langBtn, lang === key && styles.langBtnActive]}
            onPress={() => setLang(key)}>
            <Text style={[styles.langText, lang === key && styles.langTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#16a34a" style={{ marginTop: 40 }} />
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
                    <ActivityIndicator color="#16a34a" size="small" />
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

      {/* 新建笔记弹窗 */}
      <Modal visible={showNoteModal} transparent animationType="slide">
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>{t.newNote}</Text>
              <View style={styles.langToggle}>
                {(["zh", "en"] as const).map(l => (
                  <TouchableOpacity key={l}
                    style={[styles.langToggleBtn, noteLang === l && styles.langToggleBtnActive]}
                    onPress={() => setNoteLang(l)}>
                    <Text style={[styles.langToggleText, noteLang === l && styles.langToggleTextActive]}>
                      {l === "zh" ? "中文" : "English"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={styles.noteInput} placeholder="标题" value={noteTitle}
                onChangeText={setNoteTitle} returnKeyType="next" />
              <TextInput style={[styles.noteInput, styles.noteContentInput]}
                placeholder={t.noteContentPlaceholder}
                value={noteContent} onChangeText={setNoteContent}
                multiline numberOfLines={6} textAlignVertical="top" />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNote} disabled={savingNote}>
                <Text style={styles.saveBtnText}>{savingNote ? t.saving : t.save}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowNoteModal(false)}>
                <Text style={styles.cancelBtnText}>{i18n.common.cancel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f7f2" },
  topBar: { backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e8f0e8" },
  filterRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 4, backgroundColor: "#f2f7f2", borderRadius: 10 },
  filterBtnActive: { backgroundColor: "#16a34a", borderRadius: 8 },
  filterText: { fontSize: 14, color: "#6b7280", lineHeight: 20 },
  filterTextActive: { color: "#fff", fontWeight: "600" },
  langRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  langBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: "#e8f0e8", alignSelf: "flex-start" },
  langBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  langText: { fontSize: 12, color: "#6b7280" },
  langTextActive: { color: "#fff", fontWeight: "600" },
  list: { padding: 16, paddingBottom: 32 },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 60, fontSize: 15 },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  articleBadge: { backgroundColor: "#dbeafe" },
  videoBadge: { backgroundColor: "#fce7f3" },
  typeText: { fontSize: 11, fontWeight: "600", color: "#1a1a1a" },
  source: { fontSize: 12, color: "#6b7280", flex: 1 },
  date: { fontSize: 11, color: "#9ca3af" },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#1a1a1a", marginBottom: 8, lineHeight: 22 },
  summary: { fontSize: 13, color: "#6b7280", lineHeight: 19, marginBottom: 10 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  tagText: { fontSize: 11, color: "#16a34a" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: "#e8f0e8" },
  actionText: { fontSize: 12, color: "#1a1a1a" },
  bookmarkBtn: { borderColor: "#e8f0e8" },
  bookmarkedBtn: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  bookmarkedText: { color: "#16a34a" },
  generateBtn: { borderColor: "#7c3aed", backgroundColor: "#f5f3ff" },
  generateText: { fontSize: 12, color: "#7c3aed" },
  generatingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6, paddingHorizontal: 4 },
  generatingText: { marginLeft: 8, fontSize: 13, color: "#16a34a" },
  // 笔记卡片
  noteCard: { backgroundColor: "#fffbeb", borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: "#f59e0b" },
  noteHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  noteBadge: { backgroundColor: "#fef3c7", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 8 },
  noteBadgeText: { fontSize: 11, fontWeight: "600", color: "#92400e" },
  noteDate: { fontSize: 11, color: "#9ca3af", flex: 1 },
  noteDelete: { paddingHorizontal: 8, paddingVertical: 3 },
  noteDeleteText: { fontSize: 12, color: "#ef4444" },
  noteTitle: { fontSize: 16, fontWeight: "bold", color: "#1a1a1a", marginBottom: 6 },
  noteContent: { fontSize: 14, color: "#1a1a1a", lineHeight: 20 },
  // 笔记弹窗
  addNoteBtn: { marginHorizontal: 16, marginBottom: 10, backgroundColor: "#f59e0b", borderRadius: 8, paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start" },
  addNoteBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalBox: { backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 16 },
  langToggle: { flexDirection: "row", gap: 8, marginBottom: 12 },
  langToggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: "#e8f0e8", alignItems: "center" },
  langToggleBtnActive: { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
  langToggleText: { fontSize: 14, color: "#1a1a1a" },
  langToggleTextActive: { color: "#fff", fontWeight: "600" },
  noteInput: { borderWidth: 1, borderColor: "#e8f0e8", borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 10 },
  noteContentInput: { height: 120, textAlignVertical: "top" },
  saveBtn: { backgroundColor: "#16a34a", borderRadius: 8, padding: 12, alignItems: "center", marginBottom: 8 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  cancelBtn: { backgroundColor: "#f2f7f2", borderRadius: 8, padding: 12, alignItems: "center" },
  cancelBtnText: { color: "#1a1a1a", fontSize: 15 },
})
