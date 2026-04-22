#!/bin/bash

DIR="/Users/liuying/Desktop/lilyproject/healthmeal"

# 自动获取局域网 IP
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
if [ -z "$IP" ]; then
  echo "❌ 无法获取局域网 IP，请确认已连接 WiFi"
  exit 1
fi

echo "✅ 当前 IP：$IP"

# 更新前端 API 地址
sed -i '' "s|const BASE_URL = .*|const BASE_URL = \"http://$IP:8001\"|" "$DIR/frontend/services/api.ts"
echo "✅ api.ts 已更新为 http://$IP:8001"

# 启动后端（新终端窗口）
osascript -e "tell app \"Terminal\" to do script \"cd $DIR/backend && python3 -m uvicorn main:app --reload --port 8001 --host 0.0.0.0\""

sleep 2

# 启动前端（新终端窗口）
osascript -e "tell app \"Terminal\" to do script \"cd $DIR/frontend && npx expo start\""

echo "✅ 后端和前端已在新窗口启动"
