# LilyClaw-web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a bilingual (Chinese-primary) Apple-style static website at `~/Desktop/LilyClaw-web/` showcasing 42 OpenClaw use cases across 6 categories, deployed to Vercel.

**Architecture:** Pure static HTML/CSS/JS. `data.js` is the single source of truth containing all 42 pre-translated case entries and 6 category configs. `index.html` renders the homepage with category filtering and card expand/collapse via `app.js`. `detail.html` is a single template that renders per-case content based on `?id=` URL parameter via `detail.js`. No build tools, no npm packages — only `marked.js` via CDN on the detail page.

**Tech Stack:** HTML5, CSS3 (Grid, custom properties, `max-height` animation), Vanilla JS ES6+, `marked.js` CDN, Vercel static hosting.

---

## File Map

| File | Responsibility |
|------|----------------|
| `LilyClaw-web/data.js` | All 42 cases + 6 categories — source of truth |
| `LilyClaw-web/styles.css` | Design system: variables, nav, hero, card grid, detail page, responsive |
| `LilyClaw-web/index.html` | Homepage: nav, hero, card grid container |
| `LilyClaw-web/app.js` | Render cards from data, filter by category, expand/collapse, language toggle |
| `LilyClaw-web/detail.html` | Detail page: gradient header, 2-tab bar, content sections, related cases |
| `LilyClaw-web/detail.js` | Read `?id=` param, render case content, tab switching, marked.js for EN tab |
| `LilyClaw-web/vercel.json` | `cleanUrls` + rewrite `/case/:id → /detail.html` |

---

## Task 1: Create project scaffold

**Files:**
- Create: `~/Desktop/LilyClaw-web/` (directory)
- Create: `data.js`, `styles.css`, `index.html`, `app.js`, `detail.html`, `detail.js`, `vercel.json` (all empty for now)

- [ ] **Step 1: Create the project directory and empty files**

```bash
mkdir -p ~/Desktop/LilyClaw-web
cd ~/Desktop/LilyClaw-web
touch data.js styles.css index.html app.js detail.html detail.js vercel.json
```

- [ ] **Step 2: Verify the scaffold**

```bash
ls ~/Desktop/LilyClaw-web/
```

Expected output:
```
app.js      data.js     detail.html detail.js   index.html  styles.css  vercel.json
```

- [ ] **Step 3: Commit scaffold**

```bash
cd ~/Desktop/LilyClaw-web
git init
git add .
git commit -m "chore: init LilyClaw-web project scaffold"
```

---

## Task 2: Write data.js — CATEGORIES + all 42 CASES

**Files:**
- Write: `~/Desktop/LilyClaw-web/data.js`

This is the largest task. Every other file depends on this data.

**Data structure per case:**
```js
{
  id: "daily-reddit-digest",       // matches GitHub filename without .md
  category: "social-media",        // one of the 6 category ids below
  title_zh: "每日 Reddit 摘要",
  title_en: "Daily Reddit Digest",
  summary_zh: "...",               // 1-2 sentence card preview in Chinese
  summary_en: "...",               // 1-2 sentence card preview in English
  description_zh: "...",           // full Chinese description paragraph
  how_to_use_zh: "...",            // numbered usage steps in Chinese (use \n for line breaks)
  description_en: "...",           // raw GitHub markdown content (copy verbatim)
  skills: ["skill-a", "skill-b"],  // array of required skill names
  github_url: "https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/<id>.md"
}
```

**GitHub raw URL pattern:**
`https://raw.githubusercontent.com/hesamsheikh/awesome-openclaw-usecases/main/usecases/<id>.md`

- [ ] **Step 1: Fetch each of the 42 raw markdown files and write data.js**

For each case in the table below, fetch `https://raw.githubusercontent.com/hesamsheikh/awesome-openclaw-usecases/main/usecases/<id>.md`, extract the content, translate to Chinese, and fill in the template. Then write the complete `data.js` file.

Complete case list with categories:

| id | category |
|----|----------|
| daily-reddit-digest | social-media |
| daily-youtube-digest | social-media |
| x-account-analysis | social-media |
| multi-source-tech-news-digest | social-media |
| x-twitter-automation | social-media |
| autonomous-game-dev-pipeline | creative |
| youtube-content-pipeline | creative |
| content-factory | creative |
| podcast-production-pipeline | creative |
| ai-video-editing | creative |
| overnight-mini-app-builder | creative |
| n8n-workflow-orchestration | devops |
| self-healing-home-server | devops |
| autonomous-project-management | productivity |
| multi-channel-customer-service | productivity |
| phone-based-personal-assistant | productivity |
| inbox-declutter | productivity |
| personal-crm | productivity |
| health-symptom-tracker | productivity |
| custom-morning-brief | productivity |
| meeting-notes-action-items | productivity |
| habit-tracker-accountability-coach | productivity |
| second-brain | productivity |
| event-guest-confirmation | productivity |
| local-crm-framework | productivity |
| todoist-task-manager | productivity |
| family-calendar-household-assistant | productivity |
| phone-call-notifications | productivity |
| multi-channel-assistant | productivity |
| dynamic-dashboard | productivity |
| aionui-cowork-desktop | productivity |
| project-state-management | productivity |
| earnings-tracker | research |
| knowledge-base-rag | research |
| market-research-product-factory | research |
| pre-build-idea-validator | research |
| semantic-memory-search | research |
| arxiv-paper-reader | research |
| latex-paper-writing | research |
| hf-papers-research-discovery | research |
| multi-agent-team | research |
| polymarket-autopilot | finance |

Write the complete `data.js` with this exact structure:

```js
const CATEGORIES = [
  {
    id: "social-media",
    zh: "社交媒体",
    en: "Social Media",
    emoji: "📱",
    gradient: "linear-gradient(135deg,#ff6b6b,#ee5a24)"
  },
  {
    id: "creative",
    zh: "创意与构建",
    en: "Creative & Building",
    emoji: "🎨",
    gradient: "linear-gradient(135deg,#4ecdc4,#44a08d)"
  },
  {
    id: "devops",
    zh: "基础设施与 DevOps",
    en: "Infrastructure & DevOps",
    emoji: "⚙️",
    gradient: "linear-gradient(135deg,#6c5ce7,#a29bfe)"
  },
  {
    id: "productivity",
    zh: "生产力工具",
    en: "Productivity",
    emoji: "⚡",
    gradient: "linear-gradient(135deg,#fdcb6e,#e17055)"
  },
  {
    id: "research",
    zh: "研究与学习",
    en: "Research & Learning",
    emoji: "🔬",
    gradient: "linear-gradient(135deg,#0984e3,#74b9ff)"
  },
  {
    id: "finance",
    zh: "金融与交易",
    en: "Finance & Trading",
    emoji: "💹",
    gradient: "linear-gradient(135deg,#00b894,#55efc4)"
  }
];

const CASES = [
  {
    id: "daily-reddit-digest",
    category: "social-media",
    title_zh: "每日 Reddit 摘要",
    title_en: "Daily Reddit Digest",
    summary_zh: "从订阅版块自动抓取热门帖，每天定时生成摘要推送",
    summary_en: "Auto-curates top Reddit posts from your subreddits into a daily digest",
    description_zh: "每天自动从你关注的 Reddit 版块抓取热门帖子，整理成简洁可读的摘要。系统支持按热度、最新、置顶等维度抓取，并可搜索特定话题。所有操作均为只读，不会进行投票、回复或发帖。",
    how_to_use_zh: "1. 从 Clawhub 安装 reddit-readonly 技能\n2. 告知 OpenClaw 你想关注的 subreddit 列表\n3. 设置每日摘要的推送时间（如每天 17:00）\n4. OpenClaw 将记住你的偏好并持续优化摘要内容",
    description_en: `# Daily Reddit Digest\n\nBrowse top posts from your favorite subreddits and get a daily digest delivered automatically.\n\n## Required Skills\n- reddit-readonly (from Clawhub)\n\n## How to Use\n1. Install the reddit-readonly skill\n2. Tell your OpenClaw which subreddits to monitor\n3. Set a daily digest time\n4. OpenClaw will learn your preferences and improve over time\n\n## Notes\nThis is a read-only tool. It cannot post, vote, or comment.`,
    skills: ["reddit-readonly", "memory"],
    github_url: "https://github.com/hesamsheikh/awesome-openclaw-usecases/blob/main/usecases/daily-reddit-digest.md"
  },
  // ... (fetch and fill remaining 41 cases following the exact same structure)
];
```

> **Implementation note:** Fetch each raw URL, read the markdown content, and:
> - Extract the title for `title_en`
> - Translate the main description for `description_zh`
> - Extract or infer skill names for `skills` array
> - Write numbered usage steps in Chinese for `how_to_use_zh`
> - Copy raw markdown verbatim into `description_en`
> - Write 1-2 sentence summaries for both `summary_zh` and `summary_en`

- [ ] **Step 2: Verify data.js loads without syntax errors**

Open browser console and run:
```bash
cd ~/Desktop/LilyClaw-web
node -e "eval(require('fs').readFileSync('data.js','utf8')); console.log('CATEGORIES:', CATEGORIES.length, 'CASES:', CASES.length)"
```

Expected output:
```
CATEGORIES: 6 CASES: 42
```

- [ ] **Step 3: Commit data**

```bash
cd ~/Desktop/LilyClaw-web
git add data.js
git commit -m "feat: add complete data.js with 42 cases and 6 categories"
```

---

## Task 3: Write styles.css

**Files:**
- Write: `~/Desktop/LilyClaw-web/styles.css`

- [ ] **Step 1: Write the complete styles.css**

```css
/* ─── Design tokens ─── */
:root {
  --c-primary:    #1d1d1f;
  --c-secondary:  #86868b;
  --c-bg:         #f5f5f7;
  --c-white:      #ffffff;
  --c-blue:       #0071e3;
  --font:         -apple-system, BlinkMacSystemFont, "SF Pro Display", "PingFang SC", sans-serif;
  --r-card:       12px;
  --r-pill:       20px;
  --r-btn:        8px;
  --shadow:       0 2px 8px rgba(0,0,0,0.08);
  --shadow-hover: 0 8px 24px rgba(0,0,0,0.12);
  --t:            all 0.3s ease;
}

/* ─── Reset ─── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font); background: var(--c-bg); color: var(--c-primary); -webkit-font-smoothing: antialiased; }
a { text-decoration: none; }

/* ─── Sticky nav ─── */
.nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  padding: 0 24px; height: 52px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 16px;
}
.nav-brand { font-size: 17px; font-weight: 600; color: var(--c-primary); }
.nav-pills { display: flex; gap: 4px; flex: 1; justify-content: center; flex-wrap: nowrap; overflow: hidden; }
.nav-pill {
  padding: 5px 13px; border-radius: var(--r-pill);
  font-size: 13px; font-weight: 500; color: var(--c-secondary);
  cursor: pointer; border: none; background: transparent;
  transition: var(--t); white-space: nowrap;
}
.nav-pill:hover { color: var(--c-primary); }
.nav-pill.active { background: var(--c-primary); color: #fff; }
.nav-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.lang-toggle {
  font-size: 13px; font-weight: 500; color: var(--c-blue);
  cursor: pointer; border: none; background: transparent; padding: 4px 8px;
}
.github-link { font-size: 13px; color: var(--c-secondary); }
.github-link:hover { color: var(--c-primary); }

/* ─── Hero ─── */
.hero {
  background: #1d1d1f; padding: 80px 24px 60px;
  text-align: center; color: #f5f5f7;
}
.hero-title { font-size: 52px; font-weight: 700; letter-spacing: -1.5px; line-height: 1.05; margin-bottom: 14px; }
.hero-subtitle { font-size: 18px; color: #86868b; margin-bottom: 36px; letter-spacing: -0.2px; }
.hero-pills { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.hero-pill {
  padding: 8px 18px; border-radius: var(--r-pill);
  font-size: 14px; font-weight: 500;
  cursor: pointer; border: 1.5px solid rgba(255,255,255,0.25);
  color: rgba(255,255,255,0.75); background: transparent;
  transition: var(--t);
}
.hero-pill:hover { border-color: rgba(255,255,255,0.5); color: #fff; }
.hero-pill.active { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.6); color: #fff; }

/* ─── Main grid ─── */
.main { max-width: 1200px; margin: 0 auto; padding: 40px 24px 80px; }
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

/* ─── Card ─── */
.card {
  background: var(--c-white); border-radius: var(--r-card);
  overflow: hidden; box-shadow: var(--shadow);
  transition: var(--t); display: flex; flex-direction: column;
}
.card:hover { box-shadow: var(--shadow-hover); transform: translateY(-2px); }
.card.hidden { display: none; }

.card-header {
  padding: 18px 20px 14px;
  display: flex; align-items: center; gap: 10px;
}
.card-emoji { font-size: 22px; line-height: 1; }
.card-cat-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 0.5px; }

.card-body { padding: 14px 20px 4px; flex: 1; }
.card-title-zh { font-size: 15px; font-weight: 600; color: var(--c-primary); line-height: 1.3; }
.card-title-en { font-size: 12px; color: var(--c-secondary); margin-top: 2px; }

.card-toggle {
  width: 100%; padding: 10px 20px;
  border: none; background: #f9f9f9; border-top: 1px solid #f0f0f0;
  font-size: 13px; color: var(--c-secondary); cursor: pointer;
  display: flex; justify-content: space-between; align-items: center;
  transition: var(--t);
}
.card-toggle:hover { background: #efefef; }
.card-toggle-arrow { transition: transform 0.3s ease; display: inline-block; }
.card.expanded .card-toggle-arrow { transform: rotate(180deg); }

.card-expand { max-height: 0; overflow: hidden; transition: max-height 0.4s ease; }
.card.expanded .card-expand { max-height: 320px; }
.card-expand-inner { padding: 14px 20px 18px; border-top: 1px solid #f0f0f0; }
.card-summary { font-size: 13px; color: #3d3d3f; line-height: 1.65; margin-bottom: 10px; }
.card-skills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.card-skill { background: #f5f5f7; color: #3d3d3f; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 500; }
.card-detail-link { font-size: 13px; font-weight: 500; color: var(--c-blue); }
.card-detail-link:hover { text-decoration: underline; }

/* ─── Footer ─── */
.footer {
  text-align: center; padding: 40px 24px;
  color: var(--c-secondary); font-size: 13px;
  border-top: 1px solid #e5e5e7;
}
.footer a { color: var(--c-blue); }

/* ─── Detail: nav ─── */
.detail-nav {
  position: sticky; top: 0; z-index: 100;
  background: rgba(255,255,255,0.85);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  padding: 0 24px; height: 52px;
  display: flex; align-items: center; justify-content: space-between;
}
.back-btn { font-size: 14px; font-weight: 500; color: var(--c-blue); display: flex; align-items: center; gap: 4px; }
.back-btn:hover { text-decoration: underline; }

/* ─── Detail: header ─── */
.detail-header { padding: 48px 48px 40px; display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.detail-header-emoji { font-size: 52px; line-height: 1; flex-shrink: 0; }
.detail-header-text { flex: 1; min-width: 200px; }
.detail-title-zh { font-size: 36px; font-weight: 700; color: #fff; letter-spacing: -0.5px; line-height: 1.1; }
.detail-title-en { font-size: 18px; color: rgba(255,255,255,0.75); margin-top: 6px; }
.detail-cat { font-size: 13px; color: rgba(255,255,255,0.6); margin-top: 8px; font-weight: 500; }
.detail-github-btn {
  padding: 9px 18px; background: rgba(255,255,255,0.2);
  color: #fff; border-radius: var(--r-pill);
  font-size: 13px; font-weight: 500; flex-shrink: 0;
  transition: var(--t);
}
.detail-github-btn:hover { background: rgba(255,255,255,0.3); }

/* ─── Detail: tabs ─── */
.detail-tabs {
  background: var(--c-white); border-bottom: 1px solid #e5e5e7;
  padding: 0 48px; display: flex;
}
.detail-tab {
  padding: 14px 20px; font-size: 14px; font-weight: 500;
  color: var(--c-secondary); cursor: pointer;
  border: none; background: transparent;
  border-bottom: 2px solid transparent; transition: var(--t);
}
.detail-tab:hover { color: var(--c-primary); }
.detail-tab.active { color: var(--c-primary); border-bottom-color: var(--c-primary); }

/* ─── Detail: content ─── */
.detail-content { max-width: 760px; margin: 0 auto; padding: 40px 48px; }
.detail-section { margin-bottom: 32px; }
.detail-section-label { font-size: 11px; font-weight: 700; color: var(--c-secondary); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
.detail-section-body { font-size: 15px; color: #3d3d3f; line-height: 1.75; white-space: pre-line; }
.detail-skills { display: flex; flex-wrap: wrap; gap: 8px; }
.detail-skill { background: #f5f5f7; color: var(--c-primary); padding: 6px 14px; border-radius: var(--r-btn); font-size: 13px; font-weight: 500; }
.tab-panel { display: none; }
.tab-panel.active { display: block; }

/* ─── Markdown (English tab) ─── */
.markdown-body h1, .markdown-body h2, .markdown-body h3 { font-weight: 600; margin: 22px 0 10px; color: var(--c-primary); }
.markdown-body h1 { font-size: 22px; }
.markdown-body h2 { font-size: 18px; }
.markdown-body h3 { font-size: 15px; }
.markdown-body p { font-size: 15px; color: #3d3d3f; line-height: 1.75; margin-bottom: 12px; }
.markdown-body ul, .markdown-body ol { margin: 6px 0 12px 20px; }
.markdown-body li { font-size: 15px; color: #3d3d3f; line-height: 1.65; margin-bottom: 4px; }
.markdown-body code { background: #f5f5f7; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: "SF Mono", ui-monospace, monospace; color: var(--c-primary); }
.markdown-body pre { background: #f5f5f7; padding: 16px; border-radius: 8px; overflow-x: auto; margin-bottom: 16px; }
.markdown-body pre code { background: none; padding: 0; }
.markdown-body blockquote { border-left: 3px solid #e5e5e7; padding-left: 16px; color: var(--c-secondary); margin-bottom: 12px; }
.markdown-body strong { font-weight: 600; color: var(--c-primary); }
.markdown-body hr { border: none; border-top: 1px solid #e5e5e7; margin: 20px 0; }

/* ─── Related cases ─── */
.related { max-width: 760px; margin: 0 auto; padding: 0 48px 60px; }
.related-title { font-size: 17px; font-weight: 600; margin-bottom: 16px; }
.related-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.related-card { background: var(--c-white); border-radius: var(--r-card); overflow: hidden; box-shadow: var(--shadow); transition: var(--t); }
.related-card:hover { box-shadow: var(--shadow-hover); transform: translateY(-2px); }

/* ─── Responsive ─── */
@media (max-width: 1024px) { .nav-pills { display: none; } }
@media (max-width: 768px) {
  .hero-title { font-size: 36px; }
  .detail-header { padding: 32px 24px 28px; }
  .detail-title-zh { font-size: 26px; }
  .detail-tabs { padding: 0 24px; }
  .detail-content { padding: 32px 24px; }
  .related { padding: 0 24px 48px; }
  .related-grid { grid-template-columns: 1fr; }
}
@media (max-width: 480px) {
  .card-grid { grid-template-columns: 1fr; }
  .hero { padding: 60px 16px 48px; }
}
```

- [ ] **Step 2: Commit styles**

```bash
cd ~/Desktop/LilyClaw-web
git add styles.css
git commit -m "feat: add complete Apple-style CSS design system"
```

---

## Task 4: Write index.html

**Files:**
- Write: `~/Desktop/LilyClaw-web/index.html`

- [ ] **Step 1: Write index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lily OpenClaw 用例库</title>
  <meta name="description" content="汇聚 42 个 OpenClaw 真实应用场景，覆盖社交、创意、DevOps、生产力、研究、金融 6 大类别">
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Nav -->
  <nav class="nav">
    <span class="nav-brand">Lily OpenClaw</span>
    <div class="nav-pills" id="nav-pills"></div>
    <div class="nav-actions">
      <button class="lang-toggle" id="lang-toggle" onclick="toggleLang()">EN</button>
      <a class="github-link" href="https://github.com/hesamsheikh/awesome-openclaw-usecases" target="_blank">GitHub ↗</a>
    </div>
  </nav>

  <!-- Hero -->
  <section class="hero">
    <h1 class="hero-title" id="hero-title">Lily OpenClaw 用例库</h1>
    <p class="hero-subtitle" id="hero-subtitle">汇聚 42 个真实应用场景 · 6 大类别</p>
    <div class="hero-pills" id="hero-pills"></div>
  </section>

  <!-- Card grid -->
  <main class="main">
    <div class="card-grid" id="card-grid"></div>
  </main>

  <!-- Footer -->
  <footer class="footer">
    <p>
      <span id="footer-text">42 个案例 · MIT License · 数据来源</span>
      <a href="https://github.com/hesamsheikh/awesome-openclaw-usecases" target="_blank">awesome-openclaw-usecases</a>
    </p>
  </footer>

  <script src="data.js"></script>
  <script src="app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Open index.html in browser and verify the page structure loads**

```bash
open ~/Desktop/LilyClaw-web/index.html
```

Expected: page loads, nav visible, hero section visible, empty card grid (app.js not written yet — blank grid is expected).

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/LilyClaw-web
git add index.html
git commit -m "feat: add index.html homepage structure"
```

---

## Task 5: Write app.js

**Files:**
- Write: `~/Desktop/LilyClaw-web/app.js`

- [ ] **Step 1: Write app.js**

```js
// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  lang: localStorage.getItem('lilyclaw-lang') || 'zh',
  activeCategory: 'all',
  expandedCardId: null,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getCat(id) { return CATEGORIES.find(c => c.id === id); }
function t(zh, en) { return state.lang === 'zh' ? zh : en; }

// ─── Render: nav + hero pills ─────────────────────────────────────────────────
function renderPills() {
  const allCats = [{ id: 'all', zh: '全部', en: 'All' }, ...CATEGORIES];
  const pillHtml = allCats.map(cat => `
    <button class="nav-pill ${state.activeCategory === cat.id ? 'active' : ''}"
      onclick="filterBy('${cat.id}')">
      ${t(cat.zh, cat.en)}
    </button>
  `).join('');
  const heroPillHtml = allCats.map(cat => `
    <button class="hero-pill ${state.activeCategory === cat.id ? 'active' : ''}"
      onclick="filterBy('${cat.id}')">
      ${t(cat.zh, cat.en)}
    </button>
  `).join('');
  document.getElementById('nav-pills').innerHTML = pillHtml;
  document.getElementById('hero-pills').innerHTML = heroPillHtml;
}

// ─── Render: card grid ────────────────────────────────────────────────────────
function renderCards() {
  const grid = document.getElementById('card-grid');
  grid.innerHTML = CASES.map(c => {
    const cat = getCat(c.category);
    const isExpanded = state.expandedCardId === c.id;
    const isHidden = state.activeCategory !== 'all' && state.activeCategory !== c.category;
    return `
      <div class="card${isExpanded ? ' expanded' : ''}${isHidden ? ' hidden' : ''}" id="card-${c.id}">
        <div class="card-header" style="background:${cat.gradient}">
          <span class="card-emoji">${cat.emoji}</span>
          <span class="card-cat-label">${t(cat.zh, cat.en)}</span>
        </div>
        <div class="card-body">
          <div class="card-title-zh">${t(c.title_zh, c.title_en)}</div>
          <div class="card-title-en">${t(c.title_en, c.title_zh)}</div>
        </div>
        <button class="card-toggle" onclick="toggleCard('${c.id}')">
          <span>${t('展开详情', 'Expand')}</span>
          <span class="card-toggle-arrow">▾</span>
        </button>
        <div class="card-expand">
          <div class="card-expand-inner">
            <p class="card-summary">${t(c.summary_zh, c.summary_en)}</p>
            <div class="card-skills">
              ${c.skills.map(s => `<span class="card-skill">${s}</span>`).join('')}
            </div>
            <a class="card-detail-link" href="detail.html?id=${c.id}">
              ${t('查看完整详情', 'View Full Details')} →
            </a>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── Render: static text nodes ───────────────────────────────────────────────
function renderText() {
  document.getElementById('hero-title').textContent = t('Lily OpenClaw 用例库', 'Lily OpenClaw Use Cases');
  document.getElementById('hero-subtitle').textContent = t('汇聚 42 个真实应用场景 · 6 大类别', '42 real-world use cases across 6 categories');
  document.getElementById('footer-text').textContent = t('42 个案例 · MIT License · 数据来源 ', '42 cases · MIT License · Source ');
  document.getElementById('lang-toggle').textContent = state.lang === 'zh' ? 'EN' : '中文';
}

// ─── Actions ─────────────────────────────────────────────────────────────────
function filterBy(categoryId) {
  state.activeCategory = categoryId;
  state.expandedCardId = null;
  renderPills();
  renderCards();
}

function toggleCard(cardId) {
  state.expandedCardId = state.expandedCardId === cardId ? null : cardId;
  renderCards();
}

function toggleLang() {
  state.lang = state.lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('lilyclaw-lang', state.lang);
  renderText();
  renderPills();
  renderCards();
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderText();
  renderPills();
  renderCards();
});
```

- [ ] **Step 2: Open index.html and verify**

```bash
open ~/Desktop/LilyClaw-web/index.html
```

Check all of the following:
- [ ] All 42 cards render in the grid
- [ ] Category pills appear in nav and hero
- [ ] Clicking "社交媒体" shows only 5 social media cards, hides others
- [ ] Clicking "全部" shows all 42 cards again
- [ ] Clicking "展开详情" on a card expands it with summary + skills + detail link
- [ ] Clicking another card collapses the first and expands the second
- [ ] Clicking "EN" toggle switches all text to English and back
- [ ] Language preference persists after page reload (localStorage)
- [ ] On mobile width (< 480px): single-column grid

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/LilyClaw-web
git add app.js
git commit -m "feat: add app.js homepage interactivity"
```

---

## Task 6: Write detail.html

**Files:**
- Write: `~/Desktop/LilyClaw-web/detail.html`

- [ ] **Step 1: Write detail.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>案例详情 · Lily OpenClaw</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>

  <!-- Nav -->
  <nav class="detail-nav">
    <a class="back-btn" id="back-btn" href="index.html">← 返回案例库</a>
    <div class="nav-actions">
      <button class="lang-toggle" id="lang-toggle" onclick="toggleLang()">EN</button>
    </div>
  </nav>

  <!-- Header (gradient bg set by JS) -->
  <div class="detail-header" id="detail-header">
    <div class="detail-header-emoji" id="detail-emoji"></div>
    <div class="detail-header-text">
      <div class="detail-title-zh" id="detail-title-zh"></div>
      <div class="detail-title-en" id="detail-title-en"></div>
      <div class="detail-cat" id="detail-cat"></div>
    </div>
    <a class="detail-github-btn" id="detail-github-btn" href="#" target="_blank">GitHub 原文 ↗</a>
  </div>

  <!-- Tab bar -->
  <div class="detail-tabs">
    <button class="detail-tab active" data-tab="zh" onclick="switchTab('zh')" id="tab-btn-zh">中文版本</button>
    <button class="detail-tab" data-tab="en" onclick="switchTab('en')" id="tab-btn-en">English Version</button>
  </div>

  <!-- Chinese tab -->
  <div class="detail-content tab-panel active" id="tab-zh">
    <div class="detail-section">
      <div class="detail-section-label" id="label-desc">功能说明</div>
      <div class="detail-section-body" id="desc-body"></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-label" id="label-skills">所需技能</div>
      <div class="detail-skills" id="skills-body"></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-label" id="label-usage">使用方法</div>
      <div class="detail-section-body" id="usage-body"></div>
    </div>
  </div>

  <!-- English tab -->
  <div class="detail-content tab-panel markdown-body" id="tab-en"></div>

  <!-- Related cases -->
  <div class="related" id="related-section">
    <div class="related-title" id="related-title">同类别案例</div>
    <div class="related-grid" id="related-grid"></div>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <script src="data.js"></script>
  <script src="detail.js"></script>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
cd ~/Desktop/LilyClaw-web
git add detail.html
git commit -m "feat: add detail.html case detail page structure"
```

---

## Task 7: Write detail.js

**Files:**
- Write: `~/Desktop/LilyClaw-web/detail.js`

- [ ] **Step 1: Write detail.js**

```js
// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  lang: localStorage.getItem('lilyclaw-lang') || 'zh',
  activeTab: 'zh',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function t(zh, en) { return state.lang === 'zh' ? zh : en; }

function getCaseId() {
  // Try Vercel rewrite path: /case/some-id
  const pathMatch = window.location.pathname.match(/\/case\/([^/]+)/);
  if (pathMatch) return pathMatch[1];
  // Fall back to query string: ?id=some-id
  return new URLSearchParams(window.location.search).get('id');
}

function getCat(id) { return CATEGORIES.find(c => c.id === id); }

// ─── Render ───────────────────────────────────────────────────────────────────
function renderPage(c, cat) {
  // <title>
  document.title = `${t(c.title_zh, c.title_en)} · Lily OpenClaw`;

  // Nav
  document.getElementById('lang-toggle').textContent = state.lang === 'zh' ? 'EN' : '中文';
  document.getElementById('back-btn').textContent = `← ${t('返回案例库', 'Back to Cases')}`;

  // Header
  document.getElementById('detail-header').style.background = cat.gradient;
  document.getElementById('detail-emoji').textContent = cat.emoji;
  document.getElementById('detail-title-zh').textContent = t(c.title_zh, c.title_en);
  document.getElementById('detail-title-en').textContent = t(c.title_en, c.title_zh);
  document.getElementById('detail-cat').textContent = t(cat.zh, cat.en);
  document.getElementById('detail-github-btn').href = c.github_url;

  // Tab labels
  document.getElementById('tab-btn-zh').textContent = t('中文版本', 'Chinese Version');
  document.getElementById('tab-btn-en').textContent = t('English Version', 'English Original');

  // Chinese content
  document.getElementById('label-desc').textContent = t('功能说明', 'Description');
  document.getElementById('label-skills').textContent = t('所需技能', 'Required Skills');
  document.getElementById('label-usage').textContent = t('使用方法', 'How to Use');
  // Chinese tab always shows Chinese content regardless of UI language toggle
  document.getElementById('desc-body').textContent = c.description_zh;
  document.getElementById('usage-body').textContent = c.how_to_use_zh;
  document.getElementById('skills-body').innerHTML = c.skills
    .map(s => `<span class="detail-skill">${s}</span>`).join('');

  // English markdown content
  document.getElementById('tab-en').innerHTML = marked.parse(c.description_en);

  // Related cases (same category, exclude self, max 3)
  const related = CASES.filter(r => r.category === c.category && r.id !== c.id).slice(0, 3);
  if (related.length === 0) {
    document.getElementById('related-section').style.display = 'none';
  } else {
    document.getElementById('related-title').textContent = t('同类别案例', 'Related Cases');
    document.getElementById('related-grid').innerHTML = related.map(r => `
      <a class="related-card" href="detail.html?id=${r.id}">
        <div class="card-header" style="background:${cat.gradient}">
          <span class="card-emoji">${cat.emoji}</span>
          <span class="card-cat-label">${t(cat.zh, cat.en)}</span>
        </div>
        <div class="card-body" style="padding:12px 16px 16px">
          <div class="card-title-zh">${t(r.title_zh, r.title_en)}</div>
          <div class="card-title-en">${t(r.title_en, r.title_zh)}</div>
        </div>
      </a>
    `).join('');
  }
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll('.detail-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  document.getElementById('tab-zh').classList.toggle('active', tab === 'zh');
  document.getElementById('tab-en').classList.toggle('active', tab === 'en');
}

// ─── Lang toggle ──────────────────────────────────────────────────────────────
function toggleLang() {
  state.lang = state.lang === 'zh' ? 'en' : 'zh';
  localStorage.setItem('lilyclaw-lang', state.lang);
  const id = getCaseId();
  const c = CASES.find(x => x.id === id);
  const cat = getCat(c.category);
  renderPage(c, cat);
  switchTab(state.activeTab);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const id = getCaseId();
  const c = CASES.find(x => x.id === id);

  if (!c) {
    document.body.innerHTML = `
      <div style="padding:80px;text-align:center;font-family:-apple-system,sans-serif">
        <p style="font-size:18px;color:#86868b">案例未找到 · Case not found</p>
        <a href="index.html" style="color:#0071e3;font-size:15px;margin-top:16px;display:inline-block">← 返回案例库</a>
      </div>
    `;
    return;
  }

  const cat = getCat(c.category);
  renderPage(c, cat);
  switchTab('zh');
});
```

- [ ] **Step 2: Open a detail page and verify**

```bash
open "~/Desktop/LilyClaw-web/detail.html?id=daily-reddit-digest"
```

Check all of the following:
- [ ] Gradient header renders with correct category color
- [ ] Title shows in Chinese, subtitle shows in English
- [ ] "GitHub 原文 ↗" button links to the correct GitHub URL
- [ ] "中文版本" tab shows 功能说明, 所需技能, 使用方法 sections
- [ ] "English Version" tab shows rendered markdown
- [ ] Tab switching works without page reload
- [ ] Related cases (same social-media category, not self) appear at bottom
- [ ] Clicking a related case card navigates to that case's detail page
- [ ] "← 返回案例库" navigates back to index.html
- [ ] "EN" toggle switches all labels to English
- [ ] Invalid id (`detail.html?id=nonexistent`) shows the not-found fallback

- [ ] **Step 3: Commit**

```bash
cd ~/Desktop/LilyClaw-web
git add detail.js
git commit -m "feat: add detail.js case detail page logic with tab switching"
```

---

## Task 8: Write vercel.json and deploy

**Files:**
- Write: `~/Desktop/LilyClaw-web/vercel.json`

- [ ] **Step 1: Write vercel.json**

```json
{
  "cleanUrls": true,
  "rewrites": [
    { "source": "/case/:id", "destination": "/detail.html" }
  ]
}
```

- [ ] **Step 2: Final local smoke test**

```bash
open ~/Desktop/LilyClaw-web/index.html
```

Walk through this checklist:
- [ ] Homepage loads with all 42 cards
- [ ] Category filtering works for each of the 6 categories
- [ ] Card expand/collapse works, only one open at a time
- [ ] Language toggle works and persists
- [ ] Click "查看完整详情" on any card → detail page loads correctly
- [ ] Detail page: both tabs work, related cases render, back button works

- [ ] **Step 3: Commit vercel.json**

```bash
cd ~/Desktop/LilyClaw-web
git add vercel.json
git commit -m "feat: add vercel.json with cleanUrls and case rewrite"
```

- [ ] **Step 4: Install Vercel CLI and deploy**

```bash
npm install -g vercel
cd ~/Desktop/LilyClaw-web
vercel login     # opens browser to authenticate
vercel           # follow prompts: project name "lilyclaw-web", no build command, output dir "."
```

Expected: Vercel outputs a public URL like `https://lilyclaw-web-xxxx.vercel.app`

- [ ] **Step 5: Smoke test the deployed URL**

Open the Vercel URL and verify:
- [ ] Homepage loads at `https://lilyclaw-web-xxxx.vercel.app`
- [ ] Detail page loads at `https://lilyclaw-web-xxxx.vercel.app/detail.html?id=daily-reddit-digest`
- [ ] Clean URL works: `https://lilyclaw-web-xxxx.vercel.app/case/daily-reddit-digest` (Vercel rewrite)

- [ ] **Step 6: Final commit**

```bash
cd ~/Desktop/LilyClaw-web
git add -A
git commit -m "chore: deploy to Vercel"
```
