#!/bin/bash

# Browser MCP Sandbox 健康检查脚本

# 检查Chrome进程是否在运行
if ! pgrep -f "chrome" > /dev/null; then
    echo "Chrome process not found"
    exit 1
fi

# 检查Chrome调试端口
if ! curl -s http://localhost:9222/json/version > /dev/null; then
    echo "Chrome debugging port not accessible"
    exit 1
fi

# 检查应用端口
app_port=${HEALTHCHECK_PORT:-8080}
if ! curl -s http://localhost:${app_port}/health > /dev/null; then
    echo "Application health endpoint not accessible"
    exit 1
fi

# 检查VNC服务器（如果配置了）
if [ -n "${VNC_PORT}" ]; then
    if ! netstat -tln | grep -q ":${VNC_PORT} "; then
        echo "VNC server not accessible"
        exit 1
    fi
fi

echo "Health check passed"
exit 0