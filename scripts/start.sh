#!/bin/bash

# Browser MCP Sandbox 启动脚本

echo "Starting Browser MCP Sandbox..."

# 启动 VNC 服务器
echo "Starting VNC server..."
vncserver :99 -geometry 1280x1024 -depth 24 -SecurityTypes None -fg &

# 等待VNC启动
sleep 3

# 启动Chrome浏览器
echo "Starting Chrome browser..."
export DISPLAY=:99
chromeOptions="${CHROME_OPTS}";
if [ -n "$CHROME_OPTS" ]; then
  echo "Using custom Chrome options: $CHROME_OPTS"
fi

google-chrome-stable \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --user-data-dir=/data \
  --window-size=1280,1024 \
  --start-maximized \
  $chromeOptions \
  &

# 等待Chrome启动
sleep 5

# 启动Node.js应用
echo "Starting Node.js application..."
cd /app
npm run start:prod

# 保持容器运行
wait