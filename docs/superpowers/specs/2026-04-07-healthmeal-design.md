# HealthMeal 设计文档

**日期**：2026-04-07
**状态**：待实现

---

## 1. 项目概述

一款帮助用户健康饮食的移动端 App，根据用户的身体数据、运动量、饮食偏好和冰箱现有食材，通过 Claude AI 智能生成个性化餐谱（日/周/月），并提供动态健康知识中心。

**目标用户**：多用户，需注册登录使用
**语言支持**：中英文双语（i18n）
**平台**：iOS + Android（React Native + Expo）

---

## 2. 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React Native + Expo |
| 后端 | FastAPI（Python） |
| 数据库 | PostgreSQL |
| AI | Claude API |
| 认证 | JWT（注册/登录） |
| 国际化 | i18n（中/英） |

**目录结构：**
```
lilyproject/
└── healthmeal/
    ├── frontend/   # React Native + Expo
    └── backend/    # FastAPI
```

---

## 3. 核心功能模块

### 3.1 用户认证
- 注册 / 登录 / 登出
- JWT token 鉴权
- 支持多用户独立数据

### 3.2 个人档案（随时可更新）
- 身高、体脂率/体重、年龄、性别
- 健康目标：**减脂** / 维持 / 增肌
- 饮食禁忌：过敏食物、不吃的食材
- 每次更新后自动重新计算每日热量目标（TDEE）及各营养素达标量

#### 运动量计算（精细化）
- **有氧运动**：类型（跑步/游泳/骑车等）+ 时长 + 强度，自动估算消耗热量
- **力量训练**：部位（胸/背/腿等）+ 组数/重量，估算消耗及蛋白质额外需求
- **日常活动**：久坐 / 轻度活动 / 站立工作等基础活动水平
- 支持每日记录当日运动，动态调整当日热量和营养素目标

### 3.3 食材管理（每日可更新）
- 三种输入方式：**拍照识别**（Claude Vision）/ **手动输入** / **语音输入**
- 食材列表持久化，可增删改
- 生成餐谱时优先使用已有食材

### 3.4 餐谱生成（AI 驱动）

#### 健康评估标准（Claude 生成餐谱时强制遵守）
- **抗炎**：优先富含 Omega-3、多酚、姜黄素等抗炎成分的食材
- **蛋白质**：按体重和运动量达到每日目标克数
- **维生素**：覆盖 A/B族/C/D/E/K，优先食物来源
- **矿物质**：钙、铁、镁、锌、钾达标
- **微量元素**：硒、铬、碘等
- **膳食纤维**：每日 25-35g 目标
- **器官健康导向**：心脏、肝脏、肠道、肾脏、骨骼等各器官有益食材优先
- 每餐展示各营养素完成度，标注对哪些器官有益

#### 餐谱生成参数
- 选择饮食风格：地中海 / 日料 / 中餐 / 西餐 / 其他
- 选择时间范围：今日 / 本周 / 本月
- Claude API 根据以下信息生成：
  - 最新个人档案（热量目标、当日运动消耗、禁忌）
  - 当日可用食材
  - 选择的饮食风格
  - 健康标准达标要求
  - 最新健康研究（可选引用）
- 每餐展示：食材清单、烹饪步骤、热量、营养素详情、器官受益说明
- 支持保存、查看历史餐谱

### 3.5 饮食记录与健康追踪

#### 拍照记录饮食
- 用户每餐可拍照上传
- Claude Vision 识别食物种类和估算份量
- 自动匹配营养库，计算热量和营养素
- 也支持手动输入（食物名称 + 份量）

#### 健康追踪仪表盘
- **日视图**：今日三餐热量 vs 目标、各营养素达标进度（抗炎评分/蛋白质/维生素/矿物质/微量元素/膳食纤维）
- **周视图**：每日热量趋势、各营养素本周达标率、运动消耗趋势
- **月视图**：整月饮食规律、体脂率/体重变化趋势、器官健康评分趋势
- Claude 根据追踪数据生成健康建议（如"本周蛋白质摄入偏低，建议增加豆类或鱼肉"）

#### 计划 vs 实际对比
- 对比 AI 生成的餐谱计划与实际食用记录
- 偏差过大时提醒用户

---

### 3.6 健康知识中心（动态更新）

#### 食物营养库
- 内置基础食物营养数据
- 管理员可后台更新数据版本
- 用户可添加自定义食物

#### 健康研究速递
- 接入 RSS 订阅源（PubMed、营养学期刊等）
- Claude 自动生成中英文摘要
- 用户可收藏、标记已读
- 一键"基于此研究生成餐谱"

#### 视频内容
- 嵌入 YouTube / B站 健康饮食视频
- 按主题分类：**减脂** / 增肌 / 地中海饮食 / 抗炎饮食 等
- 管理员可手动添加推荐视频

#### 知识与餐谱联动
- 查看研究或视频后，可一键生成相关餐谱
- Claude 生成餐谱时可引用最新研究作为依据说明

---

## 4. 数据模型（核心表）

| 表名 | 核心字段 |
|------|---------|
| users | id, email, password_hash, language, created_at |
| profiles | user_id, height, weight, body_fat_pct, age, gender, goal(reduce_fat/maintain/gain_muscle), allergies, updated_at |
| exercise_logs | user_id, type(cardio/strength), detail_json, calories_burned, logged_at |
| ingredients | user_id, name, quantity, unit, input_method(photo/manual/voice), date |
| meal_plans | user_id, style, range, content_json, created_at |
| food_logs | user_id, meal_type, photo_url, food_items_json, calories, nutrients_json, logged_at |
| health_content | type(article/video), title, url, summary_zh, summary_en, tags, created_at |
| bookmarks | user_id, content_id, created_at |

---

## 5. 主要页面（App 导航）

```
Tab 导航：
├── 首页       — 今日餐谱 + 快速生成入口
├── 餐谱       — 生成新餐谱、历史记录
├── 记录       — 拍照记录饮食、健康追踪仪表盘（日/周/月）
├── 食材       — 管理今日食材
├── 知识库     — 研究速递、视频内容
└── 我的       — 个人档案、设置、语言切换
```

---

## 6. API 主要端点

```
POST /auth/register
POST /auth/login

GET/PUT  /profile
POST /exercise-logs        # 记录运动
GET/POST /ingredients      # 支持拍照/语音/手动
DELETE   /ingredients/{id}

POST /meal-plans/generate
GET  /meal-plans/history

POST /food-logs           # 记录饮食（含拍照）
GET  /food-logs/summary   # 日/周/月汇总数据

GET  /health-content
POST /health-content/bookmark
POST /meal-plans/generate-from-content/{content_id}
```

---

## 7. 范围说明

**本期包含：**
- 用户注册登录
- 个人档案管理（减脂/维持/增肌目标，随时更新体脂率/体重）
- 运动量精细记录（有氧 + 力量训练，动态调整热量目标）
- 食材管理（拍照/手动/语音三种输入，计算食材类别及数量）
- AI 餐谱生成（日/周/月，遵守抗炎/蛋白质/维生素/矿物质/微量元素/膳食纤维/器官健康标准）
- 拍照饮食记录 + Claude Vision 识别
- 健康追踪仪表盘（日/周/月）
- 健康知识中心（文章 + 视频）
- 社交功能（分享餐谱、好友）
- 购物清单自动生成
- 可穿戴设备数据接入（如 Apple Health）
- 中英文双语

**暂不包含：**
- 线下营养师对接

---

## 8. 用户层级与付费模型

### 用户角色
| 角色 | 说明 | 限制 |
|------|------|------|
| **Owner**（你） | 超级管理员，手动指定 | 无限量 |
| **Family**（家人） | 由 Owner 邀请，白名单 | 无限量 |
| **Trial**（试用用户） | 注册即试用 | 有限制（见下） |
| **Pro**（付费用户） | 付费后解锁 | 无限量 |

### 试用版限制（Trial）
- AI 餐谱生成：**每月 10 次**
- 拍照识别食材：**每月 20 次**
- 饮食记录拍照：**每月 30 次**
- 健康知识内容：可浏览，不可 AI 解读
- 达到上限后显示付费引导页

### 付费墙
- 订阅制：**$9.99/月** 或 **$79.99/年**（约等于 6.7/月，省 33%）
- 支付方式：App Store / Google Play 内购
- 付费后角色升级为 Pro，立即解锁全部功能

### 技术实现要点
- 用户表增加 `role` 字段：`owner / family / trial / pro`
- 用量表 `usage_quotas`：按月记录每用户各类 AI 调用次数
- 每次 AI 调用前检查配额，Trial 超限返回 402 并附付费链接
- Owner 后台可手动将指定用户设为 Family
