import anthropic
import base64
import json
import os
from io import BytesIO
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

client = anthropic.Anthropic(
    api_key=os.getenv("ANTHROPIC_API_KEY"),
    base_url=os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com"),
)
MODEL = "claude-opus-4-6"


def _resize_image_base64(image_base64: str, max_px: int = 1024, quality: int = 75) -> str:
    """将图片压缩到 max_px × max_px 以内，避免 API 400 请求过大错误。"""
    raw = base64.b64decode(image_base64)
    img = Image.open(BytesIO(raw)).convert("RGB")
    if max(img.size) > max_px:
        img.thumbnail((max_px, max_px), Image.LANCZOS)
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    return base64.b64encode(buf.getvalue()).decode()


def identify_ingredients_from_image(image_base64: str, lang: str = "zh") -> list[dict]:
    """识别图片中的食材，返回 [{"name": str, "quantity": float, "unit": str}, ...]"""
    image_base64 = _resize_image_base64(image_base64)
    if lang == "en":
        prompt = (
            "Identify all ingredients in the image and estimate their quantities. "
            "Return ONLY a JSON array, format: [{\"name\": \"ingredient name\", \"quantity\": number, \"unit\": \"g or ml or pc\"}]. "
            "No other text."
        )
    else:
        prompt = (
            "请识别图片中所有食材，估算每种食材的大概数量。"
            "只返回 JSON 数组，格式：[{\"name\": \"食材名\", \"quantity\": 数字, \"unit\": \"g或ml或个\"}]"
            "不要输出任何其他文字。"
        )
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64,
                    },
                },
                {
                    "type": "text",
                    "text": prompt
                }
            ],
        }]
    )
    raw = response.content[0].text.strip()
    start = raw.find("[")
    end = raw.rfind("]") + 1
    return json.loads(raw[start:end])


def generate_meal_plan(
    profile: dict,
    ingredients: list[str],
    style: str,
    range: str,
    exercise_calories: float = 0,
    lang: str = "zh"
) -> dict:
    """生成个性化餐谱。profile: {weight, goal, allergies, tdee}"""
    style_map_zh = {
        "mediterranean": "地中海饮食", "japanese": "日式料理", "chinese": "中式料理",
        "western": "西式料理", "korean": "韩式料理", "thai": "泰式料理",
        "indian": "印度料理", "vegetarian": "素食", "vegan": "纯素",
        "lowcarb": "低碳/生酮", "highprotein": "高蛋白", "light": "清淡", "other": "均衡饮食"
    }
    style_map_en = {
        "mediterranean": "Mediterranean", "japanese": "Japanese", "chinese": "Chinese",
        "western": "Western", "korean": "Korean", "thai": "Thai",
        "indian": "Indian", "vegetarian": "Vegetarian", "vegan": "Vegan",
        "lowcarb": "Low-Carb/Keto", "highprotein": "High-Protein", "light": "Light", "other": "Balanced"
    }
    range_map_zh = {"daily": "今日（早中晚三餐）", "weekly": "本周7天（每天三餐）", "monthly": "本月（按周规划）"}
    range_map_en = {"daily": "today (breakfast, lunch, dinner)", "weekly": "this week (7 days, 3 meals each)", "monthly": "this month (weekly plan)"}
    goal_map_zh = {"reduce_fat": "减脂", "maintain": "维持体重", "gain_muscle": "增肌"}
    goal_map_en = {"reduce_fat": "fat loss", "maintain": "maintain weight", "gain_muscle": "muscle gain"}

    weight = profile.get("weight", 65)
    goal = profile.get("goal", "maintain")
    allergies = profile.get("allergies", [])
    tdee = profile.get("tdee", 2000)
    target_calories = tdee - exercise_calories if exercise_calories else tdee
    target_protein = round(weight * (2.0 if goal == "gain_muscle" else 1.6), 0)

    if lang == "en":
        allergy_str = ", ".join(allergies) if allergies else "none"
        ingredients_str = ", ".join(ingredients) if ingredients else "no restriction"
        style_label = style_map_en.get(style, "Balanced")
        range_label = range_map_en.get(range, "today")
        goal_label = goal_map_en.get(goal, "maintain weight")
        prompt = f"""Please create a {style_label} meal plan for {range_label}.

User profile:
- Weight: {weight}kg, Goal: {goal_label}
- Daily calorie target: {target_calories:.0f} kcal
- Protein target: {target_protein:.0f}g/day
- Food allergies: {allergy_str}
- Available ingredients: {ingredients_str}

Health requirements:
1. Anti-inflammatory: prioritize Omega-3, polyphenols, curcumin
2. Protein: at least {target_protein:.0f}g/day
3. Vitamins: cover A/B/C/D/E/K
4. Minerals: calcium, iron, magnesium, zinc, potassium
5. Fiber: 25-35g/day
6. Organ health: note benefits for heart/liver/gut/kidney/bones

Return ONLY JSON, no other text. Format (daily example):
{{
  "breakfast": {{
    "name": "meal name",
    "calories": number,
    "protein": number,
    "fiber": number,
    "organs": ["organ list"],
    "steps": ["step 1", "step 2"],
    "ingredients": ["ingredient 1 100g", "ingredient 2 50g"]
  }},
  "lunch": {{ same }},
  "dinner": {{ same }},
  "summary": {{
    "total_calories": number,
    "protein": number,
    "fiber": number,
    "anti_inflammatory_score": 0-10,
    "health_notes": "one-line health comment"
  }}
}}"""
    else:
        allergy_str = "、".join(allergies) if allergies else "无"
        ingredients_str = "、".join(ingredients) if ingredients else "不限"
        style_label = style_map_zh.get(style, "均衡饮食")
        range_label = range_map_zh.get(range, "今日")
        goal_label = goal_map_zh.get(goal, "维持体重")
        prompt = f"""请为我制定{range_label}的{style_label}餐谱。

用户信息：
- 体重：{weight}kg，目标：{goal_label}
- 每日热量目标：{target_calories:.0f} kcal
- 蛋白质目标：{target_protein:.0f}g/天
- 过敏食物：{allergy_str}
- 今日可用食材：{ingredients_str}

健康标准（必须达到）：
1. 抗炎：优先使用富含Omega-3、多酚、姜黄素的食材
2. 蛋白质：每日不低于{target_protein:.0f}g
3. 维生素：覆盖A/B族/C/D/E/K
4. 矿物质：钙、铁、镁、锌、钾达标
5. 膳食纤维：每日25-35g
6. 器官健康：标注每餐对心脏/肝脏/肠道/肾脏/骨骼的益处

请只返回 JSON，不要输出其他文字。格式如下（daily范围示例）：
{{
  "breakfast": {{
    "name": "餐名",
    "calories": 数字,
    "protein": 数字（克）,
    "fiber": 数字（克）,
    "organs": ["受益器官列表"],
    "steps": ["步骤1", "步骤2"],
    "ingredients": ["食材1 100g", "食材2 50g"]
  }},
  "lunch": {{ 同上 }},
  "dinner": {{ 同上 }},
  "summary": {{
    "total_calories": 数字,
    "protein": 数字,
    "fiber": 数字,
    "anti_inflammatory_score": 0-10的评分,
    "health_notes": "一句话健康点评"
  }}
}}"""

    response = client.messages.create(
        model=MODEL,
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])


def estimate_nutrition(name: str, quantity: float, unit: str, lang: str = "zh") -> dict:
    """估算食物营养成分。返回 {"calories": float, "protein": float, "fiber": float, "anti_inflammatory": float}"""
    if lang == "en":
        prompt = (
            f"Estimate the nutrition for {quantity}{unit} of {name}. "
            "Return ONLY JSON: {\"calories\": number, \"protein\": number, \"fiber\": number, \"anti_inflammatory\": 0-10 score}. "
            "No other text."
        )
    else:
        prompt = (
            f"请估算 {quantity}{unit} 的{name}的营养成分。"
            "只返回 JSON：{{\"calories\": 数字, \"protein\": 数字（克）, \"fiber\": 数字（克）, \"anti_inflammatory\": 0-10评分}}。"
            "不要输出其他文字。"
        )
    response = client.messages.create(
        model=MODEL,
        max_tokens=256,
        messages=[{"role": "user", "content": prompt}]
    )
    raw = response.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])



    """为文章生成中英文摘要。返回：{"zh": str, "en": str}"""
    response = client.messages.create(
        model=MODEL,
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": (
                f"请为以下健康/营养研究文章生成简短摘要（中英文各一句话，80字以内）。\n\n"
                f"标题：{title}\n内容：{content[:1000]}\n\n"
                "只返回 JSON，格式：{\"zh\": \"中文摘要\", \"en\": \"English summary\"}"
            )
        }]
    )
    raw = response.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])


def analyze_food_photo(image_base64: str) -> dict:
    """
    分析食物照片，返回营养信息。
    返回格式：{
      "items": [{"name": str, "calories": float, "protein": float, "fiber": float, "anti_inflammatory": float}],
      "total_calories": float, "total_protein": float, "total_fiber": float,
      "anti_inflammatory_score": float, "organs": [str]
    }
    """
    image_base64 = _resize_image_base64(image_base64)
    response = client.messages.create(
        model=MODEL,
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_base64,
                    },
                },
                {
                    "type": "text",
                    "text": (
                        "请识别图片中的食物，估算每种食物的营养成分和热量。"
                        "只返回 JSON，不输出其他文字。格式：\n"
                        '{"items":[{"name":"食物名","calories":数字,"protein":数字,"fiber":数字,"anti_inflammatory":0-10评分}],'
                        '"total_calories":数字,"total_protein":数字,"total_fiber":数字,'
                        '"anti_inflammatory_score":0-10的综合评分,"organs":["对哪些器官有益"]}'
                    )
                }
            ],
        }]
    )
    raw = response.content[0].text.strip()
    start = raw.find("{")
    end = raw.rfind("}") + 1
    return json.loads(raw[start:end])
