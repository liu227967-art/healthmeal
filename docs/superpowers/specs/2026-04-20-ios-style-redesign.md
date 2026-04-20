# iOS 风格视觉改造规格

## 目标
将 HealthMeal App 全局视觉升级为简约大气、体现健康感的 iOS 风格，中英文版本统一适用。

## 颜色系统

| 变量 | 值 | 用途 |
|------|-----|------|
| `primary` | `#16a34a` | 主色（森林绿）、按钮、高亮数字 |
| `primaryLight` | `#dcfce7` | 主色浅版、背景点缀 |
| `primaryMid` | `#86efac` | 禁用按钮、进度条未完成段 |
| `bg` | `#f2f7f2` | 全局页面背景（极淡绿灰） |
| `card` | `#ffffff` | 卡片背景 |
| `border` | `#e8f0e8` | 分割线、边框 |
| `textPrimary` | `#1a1a1a` | 主文字 |
| `textSecondary` | `#6b7280` | 次要文字、标签 |
| `textTertiary` | `#9ca3af` | 占位符、辅助说明 |
| `accent` | `#3b82f6` | 蓝色强调（次要操作按钮） |
| `danger` | `#ef4444` | 删除、错误 |
| `warning` | `#f59e0b` | 警告、纤维指标 |

## 字体层级

| 层级 | 大小 | 字重 | 用途 |
|------|------|------|------|
| 大数字 | 36px | bold | 热量等核心数字 |
| 页面标题 | 20px | 700 | 每个页面顶部标题 |
| 卡片标题 | 17px | 600 | 卡片内小标题 |
| 正文 | 15px | 400 | 列表项、描述文字 |
| 辅助 | 13px | 400 | 标签、时间、单位 |
| 超小 | 11px | 600 | Badge、类型标签 |

## 卡片规范

- 圆角：`borderRadius: 16`
- 阴影：`shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: {width:0, height:2}, elevation: 3`
- 内间距：`padding: 20`
- 卡片间距：`marginBottom: 12`

## 按钮规范

| 类型 | 背景 | 圆角 | 高度 | 字号 |
|------|------|------|------|------|
| 主按钮 | `#16a34a` | 14 | 52 | 17px semibold |
| 次按钮 | `#3b82f6` | 14 | 52 | 17px semibold |
| 危险按钮 | `#ef4444` | 14 | 52 | 17px semibold |
| 灰色/取消 | `#f3f4f6` | 14 | 52 | 17px regular，文字 `#374151` |
| 小标签按钮 | 主色或灰 | 10 | 36 | 14px |

## 输入框规范

- 边框：`1px solid #e8f0e8`
- 圆角：`12`
- 内间距：`padding: 14`
- 字号：`15px`
- 聚焦边框：`#16a34a`

## 全局主题文件

新建 `frontend/theme.ts`，导出所有颜色、字体、阴影常量，所有页面 import 使用，不再各自硬编码颜色值。

## 改造范围

以下所有文件统一替换样式：

1. `app/(tabs)/index.tsx` — 首页
2. `app/(tabs)/meal.tsx` — 餐谱
3. `app/(tabs)/tracking.tsx` — 健康记录
4. `app/(tabs)/ingredients.tsx` — 今日食材
5. `app/(tabs)/knowledge.tsx` — 知识库
6. `app/(tabs)/social.tsx` — 好友
7. `app/(tabs)/profile.tsx` — 个人档案
8. `app/(auth)/login.tsx` & `register.tsx` — 登录注册
9. `app/(tabs)/_layout.tsx` — Tab 栏颜色

## 中英文一致性

颜色、字体、卡片规范中英文版完全一致，无需区分处理。字体系统使用系统默认字体（iOS 自动使用 SF Pro，Android 使用 Roboto）。

## 不改动范围

- Tab 栏图标（保持现状）
- 功能逻辑
- 后端代码
- 翻译文件
