#!/bin/bash
#
# Скрипт захвата экрана для мониторинга
#
# Использование:
#   ./screen-capture.sh <TOKEN> [SERVER_URL] [INTERVAL] [QUALITY]
#
# Примеры:
#   ./screen-capture.sh abc123.def456
#   ./screen-capture.sh abc123.def456 https://tutor.kaluger.ru/api/screen/upload 2 30
#

TOKEN="$1"
SERVER_URL="${2:-https://tutor.kaluger.ru/api/screen/upload}"
INTERVAL="${3:-2}"
QUALITY="${4:-30}"
TMP_RAW="$HOME/Desktop/sc_raw.jpg"
TMP_FILE="$HOME/Desktop/sc.jpg"

if [ -z "$TOKEN" ]; then
  echo "Использование: $0 <TOKEN> [SERVER_URL] [INTERVAL] [QUALITY]"
  echo "  INTERVAL - пауза между снимками в секундах (по умолчанию 2)"
  echo "  QUALITY  - качество 1-100 (по умолчанию 30)"
  echo "Токен можно получить на странице /screen в приложении"
  exit 1
fi

echo "Запуск мониторинга экрана..."
echo "Сервер: $SERVER_URL"
echo "Интервал: ${INTERVAL}с, качество: ${QUALITY}%"
echo "Нажмите Ctrl+C для остановки"
echo ""

while true; do
  screencapture -t jpg -x "$TMP_RAW" 2>/dev/null
  if [ -f "$TMP_RAW" ]; then
    sips -s formatOptions "$QUALITY" "$TMP_RAW" --out "$TMP_FILE" > /dev/null 2>&1
    curl -s -L --post301 -X POST \
      -H "Content-Type: image/jpeg" \
      -H "X-Screen-Token: $TOKEN" \
      --data-binary "@${TMP_FILE}" \
      "$SERVER_URL" > /dev/null 2>&1
  fi
done
