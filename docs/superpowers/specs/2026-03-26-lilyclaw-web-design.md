# LilyClaw-web 设计规格

**日期：** 2026-03-26
**项目：** Lily-"OpenClaw" Use Cases 展示网站
**技术栈：** 纯静态 HTML + CSS + JS，部署到 Vercel

---

## 1. 项目概述

构建苹果官网风格的中英双语静态网站，汇总展示 OpenClaw 真实应用案例。数据来源：[awesome-openclaw-usecases](https://github.com/hesamsheikh/awesome-openclaw-usecases)，共 42 个案例分 6 大类别。

**网站名称：** Lily-"龙虾"应用案例 / Lily-"OpenClaw" Use Cases
**目标目录：** `~/Desktop/LilyClaw-web/`

---

## 2. 文件结构

```
LilyClaw-web/
├── index.html       # 首页
├── detail.html      # 案例详情模板（通过 ?id= 或 /case/:id 路由）
├── styles.css       # 全局样式
├── app.js           # 首页逻辑（分类筛选、卡片展开、语言切换）
├── detail.js        # 详情页逻辑（读取 id、Tab 切换、marked 渲染）
├── data.js          # 42 个案例完整数据（中英双语，构建时预翻译）
└── vercel.json      # Vercel 部署配置
```

---

## 3. 数据模型

### 3.1 类别配置

```js
const CATEGORIES = [
  { id: "social-media",  zh: "社交媒体",         en: "Social Media",
    emoji: "📱", gradient: "linear-gradient(135deg,#ff6b6b,#ee5a24)" },
  { id: "creative",      zh: "创意与构建",        en: "Creative & Building",
    emoji: "🎨", gradient: "linear-gradient(135deg,#4ecdc4,#44a08d)" },
  { id: "devops",        zh: "基础设施与DevOps",  en: "Infrastructure & DevOps",
    emoji: "⚙️", gradient: "linear-gradient(135deg,#6c5ce7,#a29bfe)" },
  { id: "productivity",  zh: "生产力工具",        en: "Productivity",
    emoji: "⚡", gradient: "linear-gradient(135deg,#fdcb6e,#e17055)" },
  { id: "research",      zh: "研究与学习",        en: "Research & Learning",
    emoji: "🔬", gradient: "linear-gradient(135deg,#0984e3,#74b9ff)" },
  { id: "finance",       zh: "金融与交易",        en: "Finance & Trading",
    emoji: "💹", gradient: "linear-gradient(135deg,#00b894,#55efc4)" },
]
```

### 3.2 案例数据结构

```js
const CASES = [
  {
    id: "daily-reddit-digest",          // 对应 GitHub 文件名（无 .md）
    category: "social-media",           // 对应 CATEGORIES[n].id
    title_zh: "每日 Reddit 摘要",
    title_en: "Daily Reddit Digest",
    summary_zh: "从订阅版块自动抓取热门帖，每天定时生成摘要推送",  // 2 行内摘要
    summary_en: "Auto-curates top Reddit posts from your subreddits into a daily digest",
    description_zh: "...",              // 完整中文说明（功能、技能、使用方法）
    description_en: "...",              // GitHub 原始 markdown 内容
    skills: ["reddit-readonly", "memory"],
    github_url: "https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/daily-reddit-digest.md"
  },
  // ... 其余 41 个案例
]
```

**数据填充策略：** 构建时由实施者批量拉取 GitHub 上 42 个 `.md` 文件，翻译并结构化填入 `data.js`，网站运行时无外部请求。

---

## 4. 首页设计（index.html）

### 4.1 布局结构

```
┌─────────────────────────────────────────────────────┐
│  NAV: Lily OpenClaw    [全部 社交 创意 DevOps…]  中/EN │
├─────────────────────────────────────────────────────┤
│  HERO (深色 #1d1d1f)                                 │
│    Lily OpenClaw 用例库                               │
│    汇聚 42 个真实应用场景 · 6 大类别                    │
│    [社交媒体] [创意构建] [基础设施] [生产力] [研究] [金融] │
├──────���──────────────────────────────────────────────┤
│  GRID (desktop 4列 / tablet 2列 / mobile 1列)         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐  │
│  │🔴 社交媒体│ │🟢 创意构建│ │🟣 DevOps │ │⚡生产力│  │
│  │ 标题（中）│ │ 标题（中）│ │ 标题（中）│ │标题（中）│ │
│  │ 副标（英）│ │ 副标（英）│ │ 副标（英）│ │副标（英）│ │
│  │ [展开 ▾] │ │ [展开 ▾] │ │ [展开 ▾] │ │[展开 ▾]│  │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘  │
│  展开状态：摘要 + 技能标签 + [查看完整详情 →]           │
├─────────────────────────────────────────────────────┤
│  FOOTER: MIT License · GitHub · 42 cases            │
└─────────────────────────────────────────────────────┘
```

### 4.2 交互规则

- **类别筛选：** Nav 胶囊 + Hero 区按钮联动，点击后过滤卡片网格（仅显示该类别卡片，其他隐藏）；点击"全部"恢复显示所有卡片
- **卡片展开：** CSS `max-height` 动画；同一时间只有一张卡片展开，点击其他卡片自动收起当前卡片
- **语言切换：** `中/EN` 按钮切换，偏好存入 `localStorage`，切换后实时更新所有文字节点
- **响应式：** CSS Grid，`grid-template-columns: repeat(auto-fill, minmax(260px, 1fr))`

---

## 5. 详情页设计（detail.html）

### 5.1 布局结构

```
┌─────────────────────────────────────────────────────┐
│  NAV: ← 返回案例库                             中/EN  │
├─────────────────────────────────────────────────────┤
│  HEADER（类别渐变色）                                 │
│    [emoji]  中文标题                                  │
│             English Title          [GitHub 原文 ↗]  │
│             类别 · Category                          │
├─────────────────────────────────────────────────────┤
│  TAB BAR: [● 中文版本]  [  English Version]          │
├─────────────────────────────────────────────────────┤
│  内容区（结构化 sections）                             │
│  • 功能说明 / Description                            │
│  • 所需技能 / Required Skills（标签形式）              │
│  • 使用方法 / How to Use                             │
├─────────────────────────────────────────────────────┤
│  同类别相关案例（最多 3 个卡片）                        │
└─────────────────────────────────────────────────────┘
```

### 5.2 Tab 行为

Tab 栏只有两个真正的 Tab，GitHub 原文链接仅保留在 Header 右上角按钮：

| Tab | 内容 | 渲染方式 |
|-----|------|---------|
| 中文版本（默认） | `description_zh` 结构化内容 | 直接 HTML |
| English Version | `description_en` 原始 markdown | `marked.js` 渲染 |

Header 右上角另有独立的 `[GitHub 原文 ↗]` 按钮（`target="_blank"` 外链），不在 Tab 栏内。

### 5.3 路由

- 主 URL 格式：`/case/daily-reddit-digest`（Vercel rewrite）
- 兼容格式：`detail.html?id=daily-reddit-digest`
- `detail.js` 优先读取路径参数，回退到 query string

---

## 6. 样式规范

- **主色：** `#1d1d1f`（苹果深黑）、`#f5f5f7`（浅灰背景）、`#0071e3`（苹果蓝）
- **字体：** `-apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif`
- **圆角：** 卡片 `12px`，标签 `20px`（胶囊），按钮 `8px`
- **阴影：** `0 2px 8px rgba(0,0,0,0.08)`（轻阴影），`0 8px 24px rgba(0,0,0,0.12)`（hover）
- **动画：** `transition: all 0.3s ease`，展开用 `max-height` 过渡

---

## 7. 部署配置

### vercel.json

```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/case/:id", "destination": "/detail.html" }
  ]
}
```

### 部署流程

1. 在 `~/Desktop/LilyClaw-web/` 创建项目文件
2. 安装并登录 Vercel CLI：`npm install -g vercel && vercel login`，然后 `vercel` 一键部署获得公开 URL
3. 无需构建步骤，直接上传静态文件

### 外部依赖（CDN）

- `marked.js`：渲染英文原始 markdown
- 无其他依赖

---

## 8. 42 个案例清单

| 类别 | 案例 id | 中文名 |
|------|---------|--------|
| social-media | daily-reddit-digest | 每日 Reddit 摘要 |
| social-media | daily-youtube-digest | 每日 YouTube 摘要 |
| social-media | x-account-analysis | X 账号分析 |
| social-media | multi-source-tech-news-digest | 多源科技新闻摘要 |
| social-media | x-twitter-automation | X/Twitter 自动化 |
| creative | autonomous-game-dev-pipeline | 自主游戏开发流水线 |
| creative | youtube-content-pipeline | YouTube 内容流水线 |
| creative | content-factory | 多智能体内容工厂 |
| creative | podcast-production-pipeline | 播客制作流水线 |
| creative | ai-video-editing | AI 视频剪辑助手 |
| creative | overnight-mini-app-builder | 夜间小应用构建器 |
| devops | n8n-workflow-orchestration | n8n 工作流编排 |
| devops | self-healing-home-server | 自愈家庭服务器 |
| productivity | autonomous-project-management | 自主项目管理 |
| productivity | multi-channel-customer-service | 多渠道客服系统 |
| productivity | phone-based-personal-assistant | 电话个人助理 |
| productivity | inbox-declutter | 收件箱整理助手 |
| productivity | personal-crm | 个人 CRM |
| productivity | health-symptom-tracker | 健康症状追踪 |
| productivity | custom-morning-brief | 自定义早报 |
| productivity | meeting-notes-action-items | 会议纪要行动项 |
| productivity | habit-tracker-accountability-coach | 习惯追踪教练 |
| productivity | second-brain | 第二大脑 |
| productivity | event-guest-confirmation | 活动嘉宾确认 |
| productivity | local-crm-framework | 本地 CRM 框架 |
| productivity | todoist-task-manager | Todoist 任务管理 |
| productivity | family-calendar-household-assistant | 家庭日历助手 |
| productivity | phone-call-notifications | 电话通知助手 |
| productivity | multi-channel-assistant | 多渠道综合助手 |
| productivity | dynamic-dashboard | 动态仪表盘 |
| productivity | aionui-cowork-desktop | AI 协作桌面 |
| productivity | project-state-management | 项目状态管理 |
| research | earnings-tracker | 财报追踪器 |
| research | knowledge-base-rag | 知识库 RAG |
| research | market-research-product-factory | 市场研究产品工厂 |
| research | pre-build-idea-validator | 构建前想法验证器 |
| research | semantic-memory-search | 语义记忆搜索 |
| research | arxiv-paper-reader | arXiv 论文阅读器 |
| research | latex-paper-writing | LaTeX 论文写作 |
| research | hf-papers-research-discovery | HF 论文研究发现 |
| research | multi-agent-team | 多智能体团队 |
| finance | polymarket-autopilot | Polymarket 自动交易 |
