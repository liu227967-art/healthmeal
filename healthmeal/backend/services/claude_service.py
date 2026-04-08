import anthropic
import json
import os
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
MODEL = "claude-opus-4-6"


def identify_ingredients_from_image(image_base64: str) -> list[dict]:
    """识别图片中的食材，返回 [{"name": str, "quantity": float, "unit": str}, ...]"""
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
                        "请识别图片中所有食材，估算每种食材的大概数量。"
                        "只返回 JSON 数组，格式：[{\"name\": \"食材名\", \"quantity\": 数字, \"unit\": \"g或ml或个\"}]"
                        "不要输出任何其他文字。"
                    )
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
    exercise_calories: float = 0
) -> dict:
    """生成个性化餐谱。profile: {weight, goal, allergies, tdee}"""
    style_map = {
        "mediterranean": "地中海饮食",
        "japanese": "日式料理",
        "chinese": "中式料理",
        "western": "西式料理",
        "other": "均衡饮食"
    }
    range_map = {
        "daily": "今日（早中晚三餐）",
        "weekly": "本周7天（每天三餐）",
        "monthly": "本月（按周规划）"
    }
    goal_map = {
        "reduce_fat": "减脂",
        "maintain": "维持体重",
        "gain_muscle": "增肌"
    }

    weight = profile.get("weight", 65)
    goal = profile.get("goal", "maintain")
    allergies = profile.get("allergies", [])
    tdee = profile.get("tdee", 2000)
    target_calories = tdee - exercise_calories if exercise_calories else tdee
    target_protein = round(weight * (2.0 if goal == "gain_muscle" else 1.6), 0)

    allergy_str = "、".join(allergies) if allergies else "无"
    ingredients_str = "、".join(ingredients) if ingredients else "不限"

    prompt = f"""请为我制定{range_map.get(range, "今日")}的{style_map.get(style, "均衡")}餐谱。

用户信息：
- 体重：{weight}kg，目标：{goal_map.get(goal, "维持")}
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
