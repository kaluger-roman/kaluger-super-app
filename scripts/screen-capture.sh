#!/bin/bash
#
# Скрипт захвата экрана для мониторинга
# Делает скриншот и сразу отправляет на сервер, без пауз
#
# Использование:
#   ./screen-capture.sh <TOKEN> [SERVER_URL]
#
# Примеры:
#   ./screen-capture.sh abc123.def456
#   ./screen-capture.sh abc123.def456 https://tutor.kaluger.ru/api/screen/upload
#

TOKEN="$1"
SERVER_URL="${2:-https://tutor.kaluger.ru/api/screen/upload}"
TMP_FILE="/tmp/.sc.jpg"

if [ -z "$TOKEN" ]; then
  echo "Использование: $0 <TOKEN> [SERVER_URL]"
  echo "Токен можно получить на странице /screen в приложении"
  exit 1
fi

echo "Запуск мониторинга экрана..."
echo "Сервер: $SERVER_URL"
echo "Нажмите Ctrl+C для остановки"
echo ""

while true; do
  screencapture -t jpg -x "$TMP_FILE" 2>/dev/null
  if [ -f "$TMP_FILE" ]; then
    curl -s -L --post301 -X POST \
      -H "Content-Type: image/jpeg" \
      -H "X-Screen-Token: $TOKEN" \
      --data-binary "@$TMP_FILE" \
      "$SERVER_URL" > /dev/null 2>&1
  fi
done
