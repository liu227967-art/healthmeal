from unittest.mock import patch, MagicMock
from services.claude_service import identify_ingredients_from_image, generate_meal_plan, analyze_food_photo, summarize_article


def test_identify_ingredients_returns_list():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='[{"name":"鸡胸肉","quantity":200,"unit":"g"},{"name":"西兰花","quantity":150,"unit":"g"}]')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = identify_ingredients_from_image("base64imagedata")
    assert isinstance(result, list)
    assert len(result) == 2
    assert result[0]["name"] == "鸡胸肉"


def test_generate_meal_plan_returns_dict():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"breakfast":{"name":"燕麦粥","calories":350,"protein":12,"fiber":8,"organs":["肠道","心脏"],"steps":["煮燕麦10分钟","加牛奶搅拌"],"ingredients":["燕麦100g"]},"lunch":{"name":"鸡胸肉沙拉","calories":450,"protein":40,"fiber":6,"organs":["肌肉","肝脏"],"steps":["煮鸡胸肉","切蔬菜","混合"],"ingredients":["鸡胸肉150g"]},"dinner":{"name":"三文鱼蔬菜","calories":500,"protein":35,"fiber":10,"organs":["心脏","大脑"],"steps":["烤三文鱼","炒蔬菜"],"ingredients":["三文鱼150g"]},"summary":{"total_calories":1300,"protein":87,"fiber":24,"anti_inflammatory_score":8.5,"health_notes":"本餐谱富含Omega-3"}}')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = generate_meal_plan(
            profile={"weight": 65, "goal": "reduce_fat", "allergies": [], "tdee": 1600},
            ingredients=["鸡胸肉", "西兰花", "燕麦"],
            style="chinese",
            range="daily",
            exercise_calories=300
        )
    assert "breakfast" in result
    assert "summary" in result
    assert result["summary"]["protein"] > 0


def test_analyze_food_photo_returns_nutrition():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"items":[{"name":"炒鸡蛋","calories":180,"protein":14,"fiber":0,"anti_inflammatory":5},{"name":"米饭","calories":220,"protein":4,"fiber":1,"anti_inflammatory":3}],"total_calories":400,"total_protein":18,"total_fiber":1,"anti_inflammatory_score":4.0,"organs":["心脏","肌肉"]}')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = analyze_food_photo("base64imagedata")
    assert "items" in result
    assert result["total_calories"] == 400
    assert result["total_protein"] == 18
    assert len(result["items"]) == 2


def test_summarize_article_returns_bilingual():
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text='{"zh":"地中海饮食能降低心脏病风险，富含Omega-3和多酚。","en":"Mediterranean diet reduces heart disease risk through Omega-3 and polyphenols."}')]
    with patch("services.claude_service.client.messages.create", return_value=mock_response):
        result = summarize_article(
            "Mediterranean Diet Study",
            "New study shows benefits of olive oil and fish consumption for cardiovascular health."
        )
    assert "zh" in result
    assert "en" in result
    assert len(result["zh"]) > 10
